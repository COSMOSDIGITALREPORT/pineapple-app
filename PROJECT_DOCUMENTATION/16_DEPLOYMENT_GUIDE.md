# 16. Deployment Guide

This document describes the deployment workflows for compiling and hosting the Pineapple components.

---

## 1. Backend Server Deployment

The Node.js Express server can be hosted on cloud platforms such as AWS (EC2), DigitalOcean, or Render.

### 1.1 Requirements
*   **Node.js**: Version `22.x` or higher.
*   **Process Manager**: **PM2** is recommended to keep the API server process alive.
*   **Startup Command**:
    ```bash
    pm2 start src/index.js --name "pineapple-backend"
    ```
*   **Server Environment Variables**: Ensure all variables listed in the Environment Variables section are populated inside the cloud instance environment.

---

## 2. Web Marketing Deployment

The `pineappleweb` folder contains plain, static client files.

*   **Hosting Recommendation**: Deploy via Cloudflare Pages, Netlify, Vercel, or AWS S3.
*   **Build Process**: None. Simply upload the contents of the `pineappleweb` directory.

---

## 3. Android Application Compiling (Release)

To compile a production-ready Android package (`.apk` or `.aab` bundle):

### 3.1 Generate Release Keystore
Generate a private signing keystore using Java's `keytool`:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### 3.2 Configure gradle credentials
Place the generated keystore inside the `android/app/` folder. Configure your release signing properties inside [`android/app/build.gradle`](file:///d:/cosmos%20internship/pineapple-app/pineappleandroidboys/android/app/build.gradle):
```gradle
signingConfigs {
    release {
        storeFile file('my-release-key.keystore')
        storePassword 'your-store-password'
        keyAlias 'your-key-alias'
        keyPassword 'your-key-password'
    }
}
```

### 3.3 Compile Package Command
Set the JVM path to Java 21, navigate to the `android/` directory, and run the Gradle bundle task:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
./gradlew bundleRelease
```
This output package will reside in: `android/app/build/outputs/bundle/release/app-release.aab`. Upload this file to the Google Play Console.

---

## 4. iOS Application Compiling (Requires Mac)

To compile the iOS app:

1.  **Xcode Signing**: Open `ios/pineapple.xcworkspace` in Xcode. Select the root target, navigate to **Signing & Capabilities**, and select your Apple Developer account team.
2.  **Product Archive**: In the Xcode menu, select **Product** -> **Archive**.
3.  **App Store Connect**: Once the archiving process completes, click **Distribute App** to upload the build to App Store Connect.
