# 09. Credentials and Access Inventory

Below is the configuration access map detailing credentials required by external APIs and accounts to run and build this application.

> [!WARNING]
> No actual password hashes, secrets, API tokens, or key values are stored in this document. All sensitive fields are masked in accordance with project security policies.

---

## 1. Credentials Map

| Service | Purpose | Dashboard / Login URL | Credential Location | Associated Environment Variable | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **MySQL DB** | Local Database Ledger | localhost / phpMyAdmin | `backend/.env` | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` | **CONGIGURED (Local Dev)** |
| **Agora RTC** | Audio/Video Stream Signaling | [console.agora.io](https://console.agora.io) | `backend/.env` | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` | **CONFIGURED (Sandbox Key)** |
| **Razorpay** | Boy Coin Purchases Gateway | [dashboard.razorpay.com](https://dashboard.razorpay.com) | `backend/.env` | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | **CONFIGURED (Staging Key)** |
| **Cloudinary** | CDN Avatar Storage | [cloudinary.com](https://cloudinary.com) | `backend/.env` | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | **CONFIGURED** |
| **Fast2SMS** | OTP Text Messaging | [fast2sms.com](https://www.fast2sms.com) | `backend/.env` | `FAST2SMS_API_KEY` | **CONFIGURED** |
| **2Factor.in** | Voice OTP Verification | [2factor.in](https://2factor.in) | `backend/.env` | `TWOFACTOR_API_KEY` | **CONFIGURED** |
| **Firebase Admin** | Notification Routing (FCM) | [console.firebase.google.com](https://console.firebase.google.com) | Root directory JSON and `backend/.env` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | **CONFIGURED** (Uses root JSON SDK file: `pineapple-8376c-...`) |
| **App Store** | iOS Build Submissions | [developer.apple.com](https://developer.apple.com) | Provisioning profile | N/A | **NOT CONFIGURED / PENDING** |
| **Google Play** | Android Build Submissions | [play.google.com/console](https://play.google.com/console) | Keystore configuration | N/A | **PARTIAL** (Debug keystore generated) |

---

## 2. Secrets Storage Locations (Developer Reference)

1.  **Backend Environment Keys**:
    *   Stored inside the file [`backend/.env`](file:///d:/cosmos%20internship/pineapple-app/backend/.env) on development machines.
2.  **Firebase Server Credentials**:
    *   File [`pineapple-8376c-firebase-adminsdk-fbsvc-a742b2a08a.json`](file:///d:/cosmos%20internship/pineapple-app/pineapple-8376c-firebase-adminsdk-fbsvc-a742b2a08a.json) at the root of the workspace.
3.  **Android Release Signing Keystores**:
    *   Development debug keystores reside inside the Android app wrapper folders: `android/app/debug.keystore`. Production release keys must be generated manually before building standalone APKs.
