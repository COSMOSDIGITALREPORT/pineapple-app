# 08. Third-Party Services Integration

This document details all external service integrations, their files, and configuration dependencies.

---

## 1. Firebase (Auth & Push Notifications)
*   **Purpose**:
    *   **Authentication**: Firebase Phone Auth provides validation for Google and custom SMS logins on mobile clients.
    *   **FCM (Firebase Cloud Messaging)**: Wakes up offline host devices to trigger the `IncomingCallScreen` overlay.
*   **Config Files**:
    *   `GoogleService-Info_boys.plist` / `GoogleService-Info_girls.plist` (iOS client setups).
    *   `google-services-boys.json` / `google-servicesgirls.json` (Android client setups).
    *   `pineapple-8376c-firebase-adminsdk-fbsvc-a742b2a08a.json` (Server-side admin credential, located at root).
*   **Backend Code**: [`backend/src/config/firebase.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/firebase.js) and [`backend/src/config/fcm.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/fcm.js).
*   **Required Environment Variables**:
    *   `FIREBASE_SERVICE_ACCOUNT` (Server credential JSON string, optional if local JSON file is present at root).
    *   `FIREBASE_PROJECT_ID` (Server push notification routing).
    *   `FIREBASE_CLIENT_EMAIL`
    *   `FIREBASE_PRIVATE_KEY`

---

## 2. Agora RTC SDK (Real-Time Streams)
*   **Purpose**: Orchestrates low-latency peer-to-peer audio and video streaming during active calls.
*   **Integration Files**:
    *   Backend: [`backend/src/config/agora.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/agora.js) and `agora-access-token` calls in `calls.js`.
    *   Client: `react-native-agora` imports in calling screens.
*   **Required Environment Variables**:
    *   `AGORA_APP_ID`: App Identifier (sandbox keys configured).
    *   `AGORA_APP_CERTIFICATE`: App certificate for secure client token authentication.

---

## 3. Razorpay Gateway (Payments & Ledger)
*   **Purpose**: Processes coin package purchases (intro trials, basic, standard, premium packages) on the Boys client app.
*   **Integration Files**:
    *   Backend order endpoint: [`backend/src/routes/payment.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/payment.js).
    *   Backend webhook listener: [`backend/src/routes/webhook.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/webhook.js).
    *   Client: `react-native-razorpay` inside `PremiumPlansScreen.jsx`.
*   **Required Environment Variables**:
    *   `RAZORPAY_KEY_ID`: Sandbox key identifier.
    *   `RAZORPAY_KEY_SECRET`: Secret hash for payment processing signature verification.

---

## 4. Cloudinary (Media Storage)
*   **Purpose**: Hosts user profile avatars. Files are uploaded via the mobile client and stored permanently on Cloudinary.
*   **Integration Files**:
    *   Backend upload route: [`backend/src/routes/upload.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/upload.js).
*   **Required Environment Variables**:
    *   `CLOUDINARY_CLOUD_NAME`
    *   `CLOUDINARY_API_KEY`
    *   `CLOUDINARY_API_SECRET`

---

## 5. SMS & Voice Gateways (Fast2SMS / 2Factor.in)
*   **Purpose**: Sends login verification codes via SMS or Voice.
*   **Integration Files**:
    *   Backend configurations: [`backend/src/config/fast2sms.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/fast2sms.js) and API endpoints in [`backend/src/routes/auth.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/auth.js).
*   **Required Environment Variables**:
    *   `FAST2SMS_API_KEY`: API key for Fast2SMS text messaging.
    *   `TWOFACTOR_API_KEY`: API key for 2Factor.in voice call OTP delivery.
