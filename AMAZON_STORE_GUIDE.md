# Amazon Appstore Submission Guide for KK Sir bpt

Follow these exact steps to upload your app to the Amazon Appstore for free.

## 1. Preparation
*   **Live App URL:** `https://ais-pre-2levp3steimmebovvc2cuf-781183105407.asia-southeast1.run.app`
*   **App Description:** (Copy this) "KK Sir bpt is a professional educational platform providing high-quality video lessons, live classes, study notes, and mock tests. Designed for students to learn at their own pace with expert guidance."
*   **Developer Account:** Register for free at [developer.amazon.com](https://developer.amazon.com).

## 2. Generate the App Package
The Amazon Appstore can ingest a Web URL directly, but for the best student experience, generate an APK:
1.  Go to **[PWABuilder.com](https://www.pwabuilder.com)**.
2.  Paste your **Live App URL** and click "Start".
3.  Click **"Package for Stores"**.
4.  Select **Android** and click "Generate".
5.  Download the ZIP file. Inside, you will find a `.aab` or `.apk` file.

## 3. Uploading to Amazon
1.  Log in to your Amazon Developer Console.
2.  Click **"Add a New App"** and select **"Android"**.
3.  Fill in the App Title: **KK Sir bpt**.
4.  In the **App Files** section, upload the APK/AAB file you got from PWABuilder.
5.  **Icons:** Use the 512x512 icon from the project.
6.  **Screenshots:** 
    *   Open your app on your phone.
    *   Take 3-5 screenshots (Home, Video List, Study Notes, Mock Test).
    *   Upload these to the "Images & Multimedia" section.

## 4. Verification (Digital Asset Links)
To remove the browser address bar within the app, Amazon expects a verification file.
1.  Once you upload the app, Amazon will provide a "SHA-256 Fingerprint".
2.  Tell me that fingerprint, and I will generate the `assetlinks.json` file for you to put in the project.

## 5. Submit
Click **"Submit App"**. Amazon usually reviews and publishes the app within 24-48 hours.

---
**Need help with screenshots or icons?** Just ask! I can provide the direct links to your app icons for you to download.
