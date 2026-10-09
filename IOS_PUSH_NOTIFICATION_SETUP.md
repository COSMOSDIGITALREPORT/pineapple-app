# iOS Push Notifications Setup Guide (For Mac / Xcode / Mac AI Chatbot)

This document explains what has been prepared in the repository for **iOS Push Notifications** and the exact native steps required when opening/building the projects on a Mac.

---

## 1. What Has Already Been Done in React Native (Codebase)

Both iOS apps (`pineappleios` and `pineapplegirlsios`) have been fully configured with the React Native Firebase messaging pipeline:

1. **Dependency Added**:
   * `@react-native-firebase/messaging` (`^24.0.0`) is added to `package.json` matching `@react-native-firebase/app`.
2. **Notification Service** ([`src/services/notifications.js`](file:///d:/cosmos/internship/pineapple-app/pineappleios/src/services/notifications.js)):
   * Requests iOS notification permissions with `messaging().requestPermission()`.
   * Acquires APNs/FCM device token with `messaging().getToken()`.
   * Automatically uploads token to backend server via `POST /auth/fcm-token`.
   * Listens for token refreshes (`onTokenRefresh`).
   * Handles foreground notifications (`onMessage`) with alerts.
   * Handles notification tap from background (`onNotificationOpenedApp`) and cold start (`getInitialNotification`).
3. **Background Handler** ([`index.js`](file:///d:/cosmos/internship/pineapple-app/pineappleios/index.js)):
   * Registered `messaging().setBackgroundMessageHandler(...)` at entry point.
4. **App Lifecycle Hooks** ([`App.jsx`](file:///d:/cosmos/internship/pineapple-app/pineappleios/App.jsx)):
   * `syncFcmToken()` and listeners are automatically triggered on app startup and refreshed after successful user login.
5. **Backend Triggers (Live on cPanel and Node.js)**:
   * **Chatbot / Support desk reply**: `POST /admin/support/reply` sends push to user.
   * **Wallet recharge**: `POST /payment/verify` sends push to boy user.
   * **Call earnings**: When call finishes, host girl receives push with earned coins.
   * **Call incoming**: When offline receiver gets a call.

---

## 2. Steps to Complete on Mac (Xcode / CocoaPods)

To compile and receive real push notifications on physical iPhones, run the following steps on your Mac:

### Step 1: Install CocoaPods
Run pod install in each iOS directory:

```bash
# 1. Boys iOS App
cd pineappleios/ios
pod install
cd ../..

# 2. Girls iOS App
cd pineapplegirlsios/ios
pod install
cd ../..
```

---

### Step 2: Configure Apple Developer Account (APNs Key)
Apple requires an APNs Auth Key to route push notifications through Firebase:

1. Go to [Apple Developer Member Center](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles** > **Keys**.
3. Click **+** to create a new key.
4. Name the key (e.g. `Pineapple APNs Key`), check **Apple Push Notifications service (APNs)**, and click **Continue** > **Register**.
5. Download the `.p8` key file (Note down the **Key ID** and your Apple **Team ID**).
6. Open [Firebase Console](https://console.firebase.google.com/) for project `pineapple-8376c`.
7. Go to **Project Settings** > **Cloud Messaging** tab.
8. Under **Apple app configuration**:
   * Upload the `.p8` file under **APNs Authentication Key**.
   * Enter the Key ID and Team ID.

---

### Step 3: Enable Capabilities in Xcode
Open `.xcworkspace` in Xcode for each app:
* `pineappleios/ios/pineapple.xcworkspace`
* `pineapplegirlsios/ios/pineapple.xcworkspace`

In Xcode:
1. Select the top project target.
2. Go to the **Signing & Capabilities** tab.
3. Click **+ Capability**:
   * Add **Push Notifications**.
   * Add **Background Modes**, then check:
     * [x] **Remote notifications**
     * [x] **Background fetch**

---

### Step 4: Verify GoogleService-Info.plist
Ensure `GoogleService-Info.plist` is added to the Xcode project and checked in "Target Membership":
* `pineappleios`: Use `GoogleService-Info_boys.plist` renamed to `GoogleService-Info.plist`.
* `pineapplegirlsios`: Use `GoogleService-Info_girls.plist` renamed to `GoogleService-Info.plist`.

---

### Step 5: Test on a Physical iPhone
* Push notifications (APNs device tokens) **cannot be tested on the iOS Simulator** (Apple does not assign APNs tokens to simulators).
* Connect a physical iPhone, build, and run the app.
* On app launch, iOS will prompt: *"Pineapple Would Like to Send You Notifications"*. Tap **Allow**.
* The device token will be retrieved and registered in the database, enabling instant push notifications.
