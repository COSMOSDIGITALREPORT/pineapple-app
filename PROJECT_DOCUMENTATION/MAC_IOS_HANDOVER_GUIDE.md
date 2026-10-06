# 🍍 Pineapple App — Project Handover & iOS Development Guide

> **Target Audience:** Mac Agent / iOS Developer taking over the project on macOS.  
> **Last Updated:** October 6, 2026  
> **Git Repository:** `https://github.com/COSMOSDIGITALREPORT/pineapple-app.git`  
> **Active Branch:** `main`

---

## 1. 🏗️ Ecosystem Architecture

The Pineapple platform consists of **4 Mobile Apps**, a unified **Node.js/Express Backend**, and a **Web Admin Dashboard**:

| Component | Technology | Directory | Status |
| :--- | :--- | :--- | :--- |
| **Backend API + Sockets** | Node.js, Express, Socket.io, TiDB (MySQL) | `backend/` | Live on Render |
| **Admin Panel** | React, Tailwind, Lucide (served statically) | `backend/admin/` | Live on Render (`/admin`) |
| **Boys App (Android)** | React Native, Agora RTC, Razorpay | `pineappleandroidboys/` | ✅ Complete (APK ready: Oct 6, 2026) |
| **Girls App (Android)** | React Native, Agora RTC, UPI Withdrawals | `pineappleandroidgirls/` | ✅ Complete (APK ready: Oct 6, 2026) |
| **Boys App (iOS)** | React Native, CocoaPods, Agora RTC iOS | `pineappleios/` | ⏳ Ready for Mac Archive / TestFlight |
| **Girls App (iOS)** | React Native, CocoaPods, Agora RTC iOS | `pineapplegirlsios/` | ⏳ Ready for Mac Archive / TestFlight |

---

## 2. ☁️ Render, Backend & Cloud Infrastructure

### Live Endpoints
- **Production Backend URL:** `https://pineapple-backend-f0yj.onrender.com`
- **Admin Dashboard URL:** `https://pineapple-backend-f0yj.onrender.com/admin`
- **Admin Login Password:** `Pineapple@2024`
- **Health Check:** `https://pineapple-backend-f0yj.onrender.com/health`

### Render Deployment Configuration
The backend and admin panel are deployed on **Render**:
- **Service ID:** `srv-dakh2hp5efls73e067kg`
- **Render API Key:** `rnd_fYVAsyd4xt6sK0eVJA74jvqCvBly`
- **Triggering a Deploy:**
  - Pushing commits to `origin/main` automatically triggers Render auto-deploy.
  - Or trigger manually via Render API:
    ```bash
    curl -X POST "https://api.render.com/v1/services/srv-dakh2hp5efls73e067kg/deploys" \
      -H "Authorization: Bearer rnd_fYVAsyd4xt6sK0eVJA74jvqCvBly" \
      -H "Accept: application/json"
    ```

### Cloud Database & Third-Party Credentials
Stored in `backend/.env`:
* **Database (TiDB Cloud MySQL):** `gateway01.ap-southeast-1.prod.alicloud.tidbcloud.com:4000`, DB: `pineapple`
* **Agora RTC (Voice & Video Calls):**
  * App ID: `ad82a5692433428ba7b8508f513d1b0b`
  * App Certificate: `5c7a7a90deed4676be6518dbbebf426e`
* **Razorpay (Payments):**
  * Key ID: `rzp_test_T6EyUZ7PKaClav`
  * Key Secret: `kNSRaj4mEm6pKnBCxl01iK4X`
* **Cloudinary (Image/Avatar Uploads):**
  * Cloud Name: `dibt1wwpz`

---

## 3. 📱 Work Completed & Verified (Android & Backend)

### 🔒 Cross-Gender Authentication Isolation (Tested & Verified on Oct 6, 2026)
Both Android and iOS apps now enforce strict cross-gender login isolation:
- **Boys App (`pineappleandroidboys` & `pineappleios`):**
  - Sends `gender: 'boy', appType: 'boy'` during `sendOtp` (Step 1) and `verifyOtp` (Step 2).
  - If a Female Host attempts to log in using the Boys App, the backend immediately blocks the request at Step 1 with:
    > *"This mobile number is registered as a Female Host on Pineapple Girls. Please use the Pineapple Girls app to login."*
- **Girls App (`pineappleandroidgirls` & `pineapplegirlsios`):**
  - Sends `gender: 'girl', appType: 'girl'` during `sendOtp` (Step 1) and `verifyOtp` (Step 2).
  - If a Male User attempts to log in using the Girls App, the backend immediately blocks the request at Step 1 with:
    > *"This mobile number is registered as a Male User on Pineapple Boys. Please use the Pineapple Boys app to login."*
- **Live Verification Status:** Tested against live TiDB database and Render production backend; returns HTTP 400 with user-friendly error banners on both applications.

### A. Boys App (`pineappleandroidboys`)
1. **Cross-Gender Protection:** Blocks female hosts at phone submission with redirect instructions.
2. **Language Picker Modal:** Structured multi-language selector integrated in `EditProfileScreen`.
3. **Connect Screen & Floating Bubbles:**
   - Fixed profile duplication (each girl profile appears only once at any given time).
   - Compacted call-picker popup so host avatar, block, and report buttons are never cut off.
   - Limited reviews display to top 2 recent reviews + "+N more reviews" expandable pill.
   - Glassmorphic card styling, gradient buttons, and premium typography.
4. **Fortune Wheel (formerly Lucky Spin):**
   - Renamed all occurrences to **"Fortune Wheel"**.
   - Enforced rule: **1 spin per premium plan recharge**.
   - Tapping locked wheel directly routes to **Top-Up / Premium Plans**.
   - Updated perfume prize emoji to perfume bottle (`🧴`).
   - Removed "Send Gift" action from wallet drawer.
5. **Premium Status Auto-Expiry:**
   - Once the 500 bonus premium coins are exhausted, backend automatically revokes boy's `is_premium` status.
6. **Fresh Android Release APK Built:**
   - Timestamp: **October 6, 2026, 13:29**
   - Location: `APKS/pineapple_boys_app.apk`

### B. Girls App (`pineappleandroidgirls`)
1. **Cross-Gender Protection:** Blocks male users at phone submission with redirect instructions.
2. **Language Picker Modal:** Structured multi-language selector integrated in `EditProfileScreen`.
3. **Dedicated Transactions Screen (`GirlsTransactionsScreen.jsx`):**
   - Drawer menu **"Transactions"** (and Earnings card) opens a unified financial ledger.
   - **📞 Call Earnings:** Duration, caller name, call type (voice/video), coins credited, INR earnings.
   - **🎁 Gift Earnings:** Gifts received with emojis (`🌹`, `🍫`, `🍰`, `🍍`, `❤️`, `🧴`, `👑`), sender name, coins, INR amount.
   - **💸 Withdrawal History:** Requested amount, UPI ID, fee breakdown, timestamp, status (`Pending`, `Approved`, `Rejected`).
   - **Hero Card:** Real-time Available Balance (₹ and 🪙), Total Earned, Total Withdrawn, direct **Redeem** button.
   - **Filter Pills:** *All*, *📞 Calls*, *🎁 Gifts*, *💸 Withdrawals*.
4. **Withdrawal Balance Deduction Fix:**
   - Pending and approved withdrawals are immediately subtracted from available balance.
5. **Caller Reviews in Earnings:**
   - Caller feedback and star ratings visible directly inside host earnings.
6. **Fresh Android Release APK Built:**
   - Timestamp: **October 6, 2026, 13:26**
   - Location: `APKS/pineapple_girls_app.apk`

### C. Admin Dashboard (`backend/admin/`)
1. **Economics & Ledger Cards:**
   - Added *Spin Gifts Won*, *Virtual Gifts Sent*, and *Unconsumed Bank Float*.
2. **Ledger Accuracy & Non-Negative Constraints:**
   - Platform revenue properly accounts for gifts without double counting calls.
   - Host unpaid balances sanitized against negative values.
3. **Users Table Balance Fix:**
   - Fixed host available coins/balance calculation to reflect accurate net earnings.

---

## 4. 🍎 Current iOS Status & Next Steps for Mac Agent

### Current Code Sync Status
* `pineapplegirlsios/src/` has already been updated with `GirlsTransactionsScreen.jsx` and drawer routing.
* `pineappleios/src/` has already been updated with `ConnectScreen.jsx`, `FortuneWheel`, and drawer navigation.
* All React Native JavaScript/JSX screens are **95%+ identical** to Android.

### Tasks for the Mac Agent / Developer:

#### Step 1: Install Dependencies (CocoaPods)
Run on macOS terminal for both apps:
```bash
# 1. Boys App
cd pineappleios
npm install
cd ios
pod install --repo-update

# 2. Girls App
cd ../../pineapplegirlsios
npm install
cd ios
pod install --repo-update
```

#### Step 2: Verify `Info.plist` Native Permissions
Ensure both iOS projects have microphone and camera usage descriptions in `ios/<AppName>/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Pineapple requires camera access for video calls.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Pineapple requires microphone access for audio and video calls.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Pineapple requires access to photos to upload profile pictures.</string>
```

#### Step 3: Configure Signing & Team in Xcode
1. Open `pineappleios/ios/pineappleios.xcworkspace` (or `pineapplegirlsios.xcworkspace`) in **Xcode**.
2. Select the top project target → **Signing & Capabilities**.
3. Select your **Apple Developer Team**.
4. Set unique Bundle Identifiers:
   - Boys App: e.g., `com.cosmosdigital.pineapple.boys`
   - Girls App: e.g., `com.cosmosdigital.pineapple.girls`

#### Step 4: Build & Export `.ipa` / TestFlight
1. Select Target Device: **Any iOS Device (arm64)**.
2. In Xcode top menu: **Product → Archive**.
3. Once archiving completes in the Organizer window:
   - **For TestFlight:** Click **Distribute App → TestFlight & App Store** → Upload. Testers can then install with 1-click via the Apple TestFlight app.
   - **For Direct `.ipa` (Ad-Hoc):** Click **Distribute App → Release Testing (Ad-Hoc)** → Export `.ipa`. Upload to [Diawi.com](https://www.diawi.com) for direct link installation on registered UDID devices.

---

## 5. 🔍 Quick Verification Checklist for Mac Agent

- [ ] Repository pulled on `main` branch.
- [ ] Node version >= 18 installed (`node -v`).
- [ ] CocoaPods installed (`gem install cocoapods` or `brew install cocoapods`).
- [ ] `pod install` passes cleanly in both `pineappleios/ios` and `pineapplegirlsios/ios`.
- [ ] Agora RTC iOS native framework compiles without missing architecture errors.
- [ ] Video/Audio call connects with remote Agora channel.
- [ ] Both apps successfully communicate with `https://pineapple-backend-f0yj.onrender.com`.
