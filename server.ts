import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Load Firebase config
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));

// Initialize Firebase Admin
let adminApp: admin.app.App;
try {
  if (!admin.apps.length) {
    // We MUST use the projectId from our config because the server's default 
    // project might not have Firestore enabled or might be the wrong project.
    adminApp = admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    console.log("Firebase Admin initialized with explicit Project ID from config:", firebaseConfig.projectId);
  } else {
    adminApp = admin.app();
    console.log("Firebase Admin already initialized. Project ID:", adminApp.options.projectId);
  }
} catch (error) {
  console.error("Error initializing Firebase Admin:", error);
  // Last resort fallback
  adminApp = admin.initializeApp();
}

// Initialize Firestore with the named database from config
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const db = getFirestore(adminApp, databaseId);
console.log("Firestore Admin initialized for project:", adminApp.options.projectId, "database:", databaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Dynamic manifest.json
  app.get("/manifest.json", async (req, res) => {
    res.type("application/manifest+json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Access-Control-Allow-Origin", "*");
    try {
      let contactSnap;
      try {
        contactSnap = await db.collection("settings").doc("contact").get();
      } catch (dbError) {
        const defaultDb = getFirestore(adminApp, "(default)");
        contactSnap = await defaultDb.collection("settings").doc("contact").get();
      }
      const contactData = contactSnap.exists ? contactSnap.data() : {};
      
      const appName = contactData?.appName || "KK Sir bpt";
      const shortName = (contactData?.appName || "KK Sir bpt").substring(0, 12);
      
      // Use a high-quality default icon if none provided
      let appIcon = contactData?.appIcon;
      if (!appIcon || appIcon.trim() === "") {
        appIcon = "https://img.icons8.com/fluency/512/000000/education.png";
      }
      
      // Try to determine icon type
      let iconType = "image/png";
      if (appIcon.startsWith("data:image/")) {
        iconType = appIcon.split(";")[0].split(":")[1];
      } else if (appIcon.toLowerCase().endsWith(".jpg") || appIcon.toLowerCase().endsWith(".jpeg")) {
        iconType = "image/jpeg";
      } else if (appIcon.toLowerCase().endsWith(".svg")) {
        iconType = "image/svg+xml";
      } else if (appIcon.toLowerCase().endsWith(".webp")) {
        iconType = "image/webp";
      }

      // Standard PWA icon sizes
      const sizes = ["144x144", "152x152", "180x180", "192x192", "512x512"];
      const icons = [];
      
      // If the icon is a base64 string, it's better to point to our internal routes 
      // instead of putting massive strings in the manifest.json
      const iconUrl = appIcon.startsWith("data:image/") ? "/icon-512.png" : appIcon;

      sizes.forEach(size => {
        icons.push({
          src: iconUrl,
          sizes: size,
          type: iconType,
          purpose: "any"
        });
        icons.push({
          src: iconUrl,
          sizes: size,
          type: iconType,
          purpose: "maskable"
        });
      });

      const manifest = {
        id: "/",
        name: appName,
        short_name: shortName,
        description: `Official learning app for ${appName}.`,
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#2563eb",
        orientation: "portrait",
        categories: ["education"],
        icons: icons
      };

      console.log(`Serving manifest for: ${appName}`);
      res.send(JSON.stringify(manifest));
    } catch (error) {
      console.error("Error serving manifest:", error);
      res.sendFile(path.join(process.cwd(), "public", "manifest.json"));
    }
  });

  // App settings endpoint for dynamic identity
  app.get("/api/app-settings", async (req, res) => {
    console.log("Fetching app settings...");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    try {
      let contactSnap;
      try {
        contactSnap = await db.collection("settings").doc("contact").get();
      } catch (dbError: any) {
        console.warn(`Primary database access failed: ${dbError.message}. Trying (default) database...`);
        const defaultDb = getFirestore(adminApp, "(default)");
        contactSnap = await defaultDb.collection("settings").doc("contact").get();
      }
      
      const contactData = contactSnap.exists ? contactSnap.data() : {};
      console.log("Settings fetched successfully:", contactData?.appName);
      res.json({
        appName: contactData?.appName || "KK Sir bpt",
        appIcon: contactData?.appIcon || "https://img.icons8.com/fluency/512/000000/education.png"
      });
    } catch (error: any) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({ error: "Failed to fetch settings", details: error.message });
    }
  });

  // Dedicated routes for common icon paths to help PWA reliability
  const serveAppIcon = async (req: express.Request, res: express.Response) => {
    try {
      let contactSnap;
      try {
        contactSnap = await db.collection("settings").doc("contact").get();
      } catch (e) {
        const defaultDb = getFirestore(adminApp, "(default)");
        contactSnap = await defaultDb.collection("settings").doc("contact").get();
      }
      const contactData = contactSnap.exists ? contactSnap.data() : {};
      const appIcon = contactData?.appIcon || "https://img.icons8.com/fluency/512/000000/education.png";
      
      if (appIcon.startsWith("data:image/")) {
        const parts = appIcon.split(",");
        const info = parts[0].split(";");
        const contentType = info[0].split(":")[1];
        const buffer = Buffer.from(parts[1], "base64");
        res.type(contentType);
        res.send(buffer);
      } else {
        res.redirect(appIcon);
      }
    } catch (error) {
      res.redirect("https://img.icons8.com/fluency/512/000000/education.png");
    }
  };

  app.get("/favicon.ico", serveAppIcon);
  app.get("/apple-touch-icon.png", serveAppIcon);
  app.get("/apple-touch-icon-precomposed.png", serveAppIcon);
  app.get("/icon-192.png", serveAppIcon);
  app.get("/icon-512.png", serveAppIcon);

  // WhatsApp Webhook Verification (GET)
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  });

  // WhatsApp Webhook Message Handling (POST)
  app.post("/api/whatsapp/webhook", async (req, res) => {
    const body = req.body;

    console.log("Incoming WhatsApp message:", JSON.stringify(body, null, 2));

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts[0];
        
        const from = message.from; // sender's phone number
        const senderName = contact.profile.name || "WhatsApp User";
        const text = message.text ? message.text.body : "[Non-text message]";

        try {
          // Save to global_messages collection (as defined in blueprint)
          await db.collection("global_messages").add({
            senderId: `whatsapp:${from}`,
            senderName: `${senderName} (WA)`,
            text: text,
            channelId: "global",
            createdAt: new Date().toISOString(),
            source: "whatsapp"
          });
          console.log("Message saved to Firestore");
        } catch (error) {
          console.error("Error saving WhatsApp message to Firestore:", error);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("Unhandled Express Error:", err);
    res.status(500).send("Internal Server Error");
  });
}

startServer();
