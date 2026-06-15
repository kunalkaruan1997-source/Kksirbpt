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

// CRITICAL: Force the project ID into the environment to prevent gRPC from picking up the container project
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
process.env.GCP_PROJECT = firebaseConfig.projectId;

console.log("CONFIG: Project ID from file:", firebaseConfig.projectId);
console.log("CONFIG: Database ID from file:", firebaseConfig.firestoreDatabaseId);

// Initialize Firebase Admin
let adminApp: admin.app.App;
let db: admin.firestore.Firestore;
let useDefaultDb = false;

const initDb = () => {
  try {
    if (!admin.apps.length) {
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    } else {
      adminApp = admin.app();
    }
    
    const dbId = firebaseConfig.firestoreDatabaseId;
    if (dbId && dbId !== "" && dbId !== "(default)" && !useDefaultDb) {
      db = getFirestore(adminApp, dbId);
    } else {
      db = getFirestore(adminApp);
    }
    console.log(`Firestore initialized for project: ${firebaseConfig.projectId} db: ${useDefaultDb ? "(default-fallback)" : (firebaseConfig.firestoreDatabaseId || "(default)")}`);
  } catch (error: any) {
    console.error("Firebase Init Error:", error.message);
    useDefaultDb = true;
    if (!admin.apps.length) adminApp = admin.initializeApp();
    else adminApp = admin.app();
    db = getFirestore(adminApp);
  }
};

initDb();

// Centralized DB helper with automatic fallback
async function safeGetDoc(collectionName: string, docId: string) {
  try {
    return await db.collection(collectionName).doc(docId).get();
  } catch (error: any) {
    const isRetryable = error.message.includes("PERMISSION_DENIED") || 
                        error.message.includes("NOT_FOUND") || 
                        error.message.includes("UNAVAILABLE") ||
                        error.message.includes("5 NOT_FOUND") ||
                        error.message.includes("7 PERMISSION_DENIED");
    
    // If it's a retryable error on a named database, try the default one and SWITCH to it
    if (isRetryable && !useDefaultDb && firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
      try {
        console.warn(`Persistent error on ${firebaseConfig.firestoreDatabaseId}: ${error.message}. Switching permanently to (default)...`);
        useDefaultDb = true;
        db = getFirestore(adminApp);
        return await db.collection(collectionName).doc(docId).get();
      } catch (fallbackError: any) {
         console.error("Fallback also failed:", fallbackError.message);
         // If it's just "NOT FOUND" (5), it might be that the document doesn't exist, which is NOT an error for safeGetDoc callers
         if (fallbackError.message.includes("5 NOT_FOUND") || fallbackError.message.includes("NOT_FOUND")) {
           return { exists: false } as any;
         }
         throw fallbackError;
      }
    }
    
    if (error.message.includes("5 NOT_FOUND") || error.message.includes("NOT_FOUND")) {
      return { exists: false } as any;
    }
    throw error;
  }
}

// Seed database with professional defaults if empty
async function seedDatabase() {
  const performSeed = async (targetDb: admin.firestore.Firestore, dbName: string) => {
    try {
      console.log(`Checking seed for database: ${dbName}`);
      const contactRef = targetDb.collection("settings").doc("contact");
      
      // Use a try-catch for the specific get call to handle "NOT_FOUND" as a signal to seed
      let contactSnap;
      try {
        contactSnap = await contactRef.get();
      } catch (e: any) {
        if (e.message.includes("NOT_FOUND") || e.message.includes("5 NOT_FOUND")) {
          console.log(`Contact settings not found in ${dbName}, proceeding to seed...`);
          contactSnap = { exists: false };
        } else {
          throw e;
        }
      }
      
      if (!contactSnap || !contactSnap.exists) {
        console.log(`Seeding defaults in ${dbName}...`);
        await contactRef.set({
          appName: "KK Sir BPT",
          appIcon: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=512&h=512&fit=crop&q=80&fm=png",
          description: "Access live sessions, recorded educational videos, comprehensive study materials, and rigorous mock tests for academic excellence with KK Sir BPT.",
          email: "support@kksirbpt.com",
          whatsapp: "911234567890",
          telegram: "kksir_official",
          instagram: "kksir_official",
          updatedAt: new Date().toISOString()
        });

        await targetDb.collection("settings").doc("monetization").set({
          adsEnabled: false,
          premiumPrice: 499,
          premiumBenefits: [
            "Ad-free Experience",
            "Exclusive Premium Videos",
            "Downloadable PDF Notes",
            "Priority Doubt Solving",
            "Full Length Mock Tests"
          ],
          bankDetails: {
            upiId: "kksir@upi",
            bankName: "Example Bank",
            accountHolder: "KK Sir Learning",
            accountNumber: "1234567890",
            ifscCode: "EXMP0001234"
          }
        });
      }
      return true;
    } catch (e: any) {
      console.error(`Seed attempt failed for ${dbName}:`, e.message);
      return false;
    }
  };

  const dbId = !useDefaultDb && firebaseConfig.firestoreDatabaseId ? firebaseConfig.firestoreDatabaseId : "(default)";
  const success = await performSeed(db, dbId);
  
  if (!success && !useDefaultDb && firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
    console.warn("Retrying seed on (default) database due to named database failure...");
    useDefaultDb = true;
    db = getFirestore(adminApp);
    await performSeed(db, "(default)");
  }
  
  console.log("Seed check completed.");
}

async function startServer() {
  await seedDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // App settings endpoint for dynamic identity
  app.get("/api/app-settings", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    try {
      const contactSnap = await safeGetDoc("settings", "contact");
      const contactData = contactSnap?.exists ? contactSnap.data() : {};
      res.json({
        appName: contactData?.appName || "KK Sir BPT",
        appIcon: contactData?.appIcon || "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=512&h=512&fit=crop&q=80&fm=png"
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Dynamic manifest.json for PWA
  app.get("/manifest.json", async (req, res) => {
    let settings = { 
      appName: "KK Sir BPT", 
      appIcon: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=512&h=512&fit=crop&q=80&fm=png" 
    };
    
    try {
      const contactSnap = await safeGetDoc("settings", "contact");
      if (contactSnap.exists) {
        const data = contactSnap.data();
        settings.appName = data?.appName || settings.appName;
        settings.appIcon = data?.appIcon || settings.appIcon;
      }
    } catch (e) {
      console.error("Manifest settings fetch error:", e);
    }

    const manifest = {
      name: settings.appName,
      short_name: settings.appName,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#00215E",
      icons: [
        {
          src: `${settings.appIcon}${settings.appIcon.includes("?") ? "&" : "?"}v=${Date.now()}&w=192&h=192&fit=crop&q=80&fm=png`,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: `${settings.appIcon}${settings.appIcon.includes("?") ? "&" : "?"}v=${Date.now()}&w=512&h=512&fit=crop&q=80&fm=png`,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };
    res.setHeader("Content-Type", "application/manifest+json");
    res.send(JSON.stringify(manifest));
  });

  // Service Worker
  app.get("/sw.js", (req, res) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Service-Worker-Allowed", "/");
    res.sendFile(path.join(process.cwd(), "public", "sw.js"));
  });
 
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
