# 13. Pending Work & Future Roadmap

This document lists the incomplete features, technical debt, and pending tasks in the codebase.

---

## 1. Task Backlog & Priority Matrix

| Priority | Task Description | Target Component | Type | Description |
| :--- | :--- | :--- | :--- | :--- |
| 🔴 **P0** | **Gradle 9 + Foojay Resolver Crash** | Mobile Client (Android) | **Environment/Build** | Gradle daemon fails to start on tasks due to deprecated `JvmVendorSpec.IBM_SEMERU` field removed in Gradle 9. Must downgrade wrapper to `8.10.2` or resolve convention version. |
| 🔴 **P0** | **MySQL Server Activation** | Backend Environment | **Environment/Setup** | The database connection currently throws `ECONNREFUSED`. Must install MySQL or launch a Docker MySQL container. |
| 🟡 **P1** | **Production API Keys Setup** | Backend / Mobile | **Configuration** | Swap all test/sandbox keys (Agora, Razorpay, Fast2SMS, 2Factor.in) with production credentials in `.env`. |
| 🟡 **P1** | **App Store & Google Play Submissions** | Mobile Client | **Deployment** | Compile build bundles, generate signing keys (keystores), configure Xcode provisioning profiles, and submit for review. |
| 🟢 **P2** | **1-on-1 Text Chat Implementation**| Mobile / Backend | **Feature** | No 1-on-1 text messaging is built between users (only audio/video is live). WebSockets need extending to route user chat texts. |
| 🟢 **P2** | **Firebase Analytics / Mixpanel** | Mobile / Backend | **Analytics** | Incorporate analytics event trackers inside payment screens and matchmaking selectors to trace user conversion. |
| 🔵 **P3** | **Refactor Duplicate Mobile Clones** | Mobile Client | **Technical Debt** | Consolidate the four separate directories (`pineappleios`, `pineapplegirlsios`, `pineappleandroidboys`, `pineappleandroidgirls`) into a single codebase using React Native environment configuration flavors. |
| 🔵 **P3** | **Automated UPI Payouts** | Backend API / Admin | **Optimization** | Connect the Admin payout approvals console to the Razorpay Payout API to automatically transfer funds to hosts' UPI IDs. |

---

## 2. Code Audit: TODOs & Placeholders

*   **Mock Avatars**: The host avatar database seeding script in [`backend/src/routes/admin.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/admin.js) pulls mock profile pictures from `https://i.pravatar.cc/300`. This should be replaced with verified production assets.
*   **Duplicate Firebase Initialization Alert**:
    *   [`backend/src/config/firebase.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/firebase.js) runs `admin.initializeApp()`.
    *   [`backend/src/config/fcm.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/fcm.js) runs its own `admin.initializeApp()` on boot.
    *   *Issue:* Initializing Firebase twice on the default app causes a crash. The initialization logic must be refactored into a single global configuration load.
