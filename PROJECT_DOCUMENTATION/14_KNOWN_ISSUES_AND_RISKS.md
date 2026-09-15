# 14. Known Issues and Security Risks

This document highlights critical security risks, potential configuration issues, and code smells identified during the audit.

---

## 1. Security & Authentication Audit

### 1.1 Firebase Dual Initialization Crash (High Risk)
*   **Risk**: Both [`firebase.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/firebase.js) and [`fcm.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/fcm.js) call `admin.initializeApp()`.
*   **Impact**: When both modules are loaded (e.g., when the server receives a connection that routes through FCM), Firebase throws an error: `The default Firebase app already exists`. This will cause the entire Node.js server process to crash.
*   **Fix**: Consolidate Firebase Admin initialization inside `firebase.js` and export the initialized `admin` instance for `fcm.js` to reuse:
    ```javascript
    // config/firebase.js
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
        admin.initializeApp({ ... });
    }
    module.exports = admin;
    ```

### 1.2 State-Based Mobile Navigation (Technical Debt)
*   **Risk**: Mobile apps do not use navigation libraries like `@react-navigation/native`. Instead, they render views conditionally using a state variable (`currentSubScreen`) in the home screens.
*   **Impact**:
    *   **Memory Overhead**: All screens remain loaded in memory, and toggle transitions do not clear screen states.
    *   **Back Button Support**: The native Android back button is not supported out-of-the-box. Pressing it will close the entire application rather than navigating to the previous sub-screen.
    *   **Maintenance**: Managing 35 screens using state variables is highly prone to bugs as the app grows.
*   **Fix**: Integrate `@react-navigation/native` and configure stack/tab navigators.

### 1.3 Client-Side Hardcoded Server Endpoints
*   **Risk**: The API URL (`https://pineapple-eynu.onrender.com`) is hardcoded in [`api.js`](file:///d:/cosmos%20internship/pineapple-app/pineappleios/src/services/api.js) and socket connection helpers.
*   **Impact**: Swapping between local development, staging, and production servers requires modifying code and rebuilding the apps.
*   **Fix**: Use `react-native-config` or standard environment variable loaders to inject the API base URL at build time.

### 1.4 Webhook Signature Verification Risk
*   **Risk**: [`webhook.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/webhook.js) processes Razorpay webhook callbacks.
*   **Impact**: Webhook endpoints are open to the public internet. If signature validation is bypassed or misconfigured, attackers could fake payload messages and manually add coins to their accounts.
*   **Fix**: Ensure signature checks are active on production, matching headers via the Razorpay webhook verification utility.
