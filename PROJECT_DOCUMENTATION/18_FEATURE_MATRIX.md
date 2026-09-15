# 18. Application Feature Matrix

Below is a master checklist documenting feature availability across all application platforms.

---

## 1. Feature Support Matrix

| Feature Module | Boys Android | Girls Android | Boys iOS | Girls iOS | Web | Admin | Backend | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Phone & OTP Sign-in** | Yes | Yes | Yes | Yes | No | No | Yes | **COMPLETE** |
| **Google Firebase Login** | Yes | No | Yes | No | No | No | Yes | **COMPLETE** |
| **Avatar Photo Upload** | Yes | Yes | Yes | Yes | No | No | Yes | **COMPLETE** |
| **Matches Discovery List**| Yes | No | Yes | No | No | No | Yes | **COMPLETE** |
| **Live Host Availability**| No | Yes | No | Yes | No | Yes | Yes | **COMPLETE** |
| **Agora Video Streaming** | Yes | Yes | Yes | Yes | No | No | Yes | **COMPLETE** |
| **Agora Audio Streaming** | Yes | Yes | Yes | Yes | No | No | Yes | **COMPLETE** |
| **Automated Coin Charging**| Yes | Yes | Yes | Yes | No | No | Yes | **COMPLETE** |
| **Razorpay Payments** | Yes | No | Yes | No | No | No | Yes | **COMPLETE** |
| **UPI Cashout Requests** | No | Yes | No | Yes | No | Yes | Yes | **COMPLETE** |
| **Live Audio Rooms** | Yes | No | Yes | No | No | No | Yes | **COMPLETE** |
| **Lucky Spin Minigame** | Yes | No | Yes | No | No | No | Yes | **COMPLETE** |
| **Host Verification Flow**| No | No | No | No | No | Yes | Yes | **COMPLETE** |
| **User Suspensions** | No | No | No | No | No | Yes | Yes | **COMPLETE** |
| **1-on-1 Text Chat** | No | No | No | No | No | No | No | **NOT IMPLEMENTED** |
| **Automated UPI Payouts** | No | No | No | No | No | No | No | **NOT IMPLEMENTED** |

---

## 2. Platform Specific Notes

*   **Payment Gateways**: Razorpay checkout integrations only reside inside the Boys mobile applications. Girls only have UPI withdrawal forms.
*   **Google Login**: Google Firebase credentials are only configured inside the Boys client apps. The Girls apps rely entirely on mobile number verification for authentication.
*   **Admin Console**: The Admin dashboard is a static web-client managed by the Express backend. It does not compile native code or require mobile runtime packages.
