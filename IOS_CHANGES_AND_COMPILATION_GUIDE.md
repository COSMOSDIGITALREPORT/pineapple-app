# iOS Master Changes & Compilation Guide
**For Developer & Mac AI Chatbot / Xcode Build Engineer**

This document provides a complete checklist of all latest features and UI adjustments implemented in the codebase, along with exact Mac / Xcode compilation instructions for both **Pineapple Boys iOS** (`pineappleios`) and **Pineapple Girls iOS** (`pineapplegirlsios`).

---

## 1. Summary of Changes Implemented Across the Codebase

### A. Settings Screen Cleanup
1. **Boys App** (`pineappleios/src/screens/SettingsScreen.jsx`):
   - Removed obsolete options: **"Call Alerts"** and **"New Messages"** (since the app only has direct audio/video calling and wallet flows, no text chat messaging).
   - Cleaned up state and toggle handlers to keep only relevant settings.
2. **Girls App** (`pineapplegirlsios/src/screens/SettingsScreen.jsx`):
   - Removed obsolete option: **"New Messages"**.
   - Kept host call alerts and account settings intact.

---

### B. Persistent Live Host Status & Call Ringing via Push
1. **Host Live Status Persistence** (`pineapplegirlsios/src/screens/GirlsEarningsScreen.jsx`):
   - Previously, the `isLive` toggle was only an in-memory React state that reset when the app closed.
   - Now, turning the "Live" toggle ON/OFF persists the choice to `AsyncStorage` (`@pineapple_host_is_live`) and syncs it with the backend via `POST /users/live-status`.
   - On app boot or refresh, the persisted live status is restored.
2. **Swiped/Killed App Handling (Host Still Receives Calls)**:
   - If a girl leaves her Live toggle ON and closes/swipes away the app from recent apps, her socket disconnects, but she **remains marked as Live (`is_live = 1`) in the database**.
   - When a caller calls her, the backend checks `is_live`. Because she is Live, the server:
     - Dispatches a high-priority FCM / APNs push notification (`type: 'incoming_call'`) with caller details (`callerName`, `callId`, `channelName`, `callType`).
     - **Does NOT** immediately abort the call with `call:unavailable`.
     - Keeps the caller ringing for up to 35 seconds to allow the girl to tap the notification and open the app.
   - Only if the girl has explicitly turned her toggle **OFF** (`is_live = 0`) does the caller immediately receive `"Host is currently offline"`.
3. **Incoming Call Push Handling** (`pineapplegirlsios/src/services/notifications.js` & `GirlsHomeScreen.jsx`):
   - Added `onIncomingCallNotification` listener.
   - When an `incoming_call` push notification arrives or is tapped, `GirlsHomeScreen` automatically opens `IncomingCallScreen` overlay with Accept / Decline options.
4. **Boys Connect Screen Filter** (`pineappleios/src/screens/ConnectScreen.jsx`):
   - Updated the **'🔴 Live'** filter and floating avatar green dots so hosts with `is_live === 1` are highlighted and accessible even if their background socket is reconnecting.

---

### C. Push Notification Infrastructure
1. **Dependencies**:
   - Both `pineappleios/package.json` and `pineapplegirlsios/package.json` include `@react-native-firebase/app` and `@react-native-firebase/messaging` (`^24.0.0`).
2. **Auto-Registration & Sync** (`src/services/notifications.js`):
   - On app launch, requests notification permissions (`messaging().requestPermission()`).
   - Retrieves device token via `messaging().getToken()` and uploads it to backend via `POST /auth/fcm-token`.
   - Re-syncs automatically on login and token refresh.
3. **Background & Cold-Start Handlers** (`index.js` & `App.jsx`):
   - Registered `messaging().setBackgroundMessageHandler(...)` at entry point.
4. **Backend Push Notifications Active**:
   - **Support Desk / Chatbot Replies**: `POST /admin/support/reply` sends push notifications to users when admin replies.
   - **Wallet Recharges**: `POST /payment/verify` sends instant confirmation push.
   - **Host Earnings**: When a call ends, host receives coins earned push.
   - **Incoming Calls**: Offline hosts receive incoming call push alerts.

---

## 2. Step-by-Step Compilation Checklist on Mac

When cloning or pulling the latest `main` branch on Mac, execute the following steps in order:

### Step 1: Install CocoaPods
Run `pod install` inside the `ios/` folders of both projects:

```bash
# 1. Boys App
cd pineappleios
npm install
cd ios
pod install --repo-update
cd ../..

# 2. Girls App
cd pineapplegirlsios
npm install
cd ios
pod install --repo-update
cd ../..
```

---

### Step 2: Configure Apple Developer Account (APNs Key)
Apple requires an APNs Auth Key (`.p8`) to route push notifications through Firebase:

1. Log in to [Apple Developer Member Center](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles** > **Keys**.
3. Click the **+** button to create a new key.
4. Enter Key Name: `Pineapple APNs Key`.
5. Check **Apple Push Notifications service (APNs)**.
6. Click **Continue** and then **Register**.
7. Download the `.p8` file (Save your **Key ID** and your Apple **Team ID**).
8. Open [Firebase Console](https://console.firebase.google.com/) for project `pineapple-8376c`.
9. Go to **Project Settings** > **Cloud Messaging** tab.
10. Under **Apple app configuration**:
    * Click **Upload** under **APNs Authentication Key**.
    * Upload your downloaded `.p8` file.
    * Enter your **Key ID** and **Team ID**.

---

### Step 3: Configure Xcode Capabilities & Signing

Open the `.xcworkspace` in Xcode for each app:
* Boys App: `pineappleios/ios/pineapple.xcworkspace`
* Girls App: `pineapplegirlsios/ios/pineapple.xcworkspace`

For **BOTH** projects:
1. Select the top project item in the left Navigator, then select the main Target.
2. In the **Signing & Capabilities** tab:
   - Select your Apple Developer **Team**.
   - Set a valid **Bundle Identifier** registered in your Apple Developer account.
3. Click **+ Capability** (top left of the tab):
   - Add **Push Notifications**.
   - Add **Background Modes**, and check:
     - [x] **Remote notifications**
     - [x] **Background fetch**

---

### Step 4: Verify GoogleService-Info.plist
Ensure `GoogleService-Info.plist` is properly added to the Xcode project with target membership checked:
* `pineappleios/ios/GoogleService-Info.plist` (Matches Boys Firebase bundle ID)
* `pineapplegirlsios/ios/GoogleService-Info.plist` (Matches Girls Firebase bundle ID)

---

### Step 5: Build & Run on Physical iPhone
> **IMPORTANT NOTE**: Push notifications (APNs tokens) **do not work on the iOS Simulator**. Testing must be done on a physical iPhone.

1. Connect your physical iPhone via USB or Wi-Fi.
2. Select your device from the Xcode target device selector.
3. Press **Cmd + R** (or click the **Play** button) to build and run.
4. On launch, tap **"Allow"** when iOS asks *"Pineapple Would Like to Send You Notifications"*.
5. The device token will automatically register with the backend server, and the device will receive incoming call and system notifications!
