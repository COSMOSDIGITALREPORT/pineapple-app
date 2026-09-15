# 17. System Architecture and Request Flows

This document details the system design, communication routes, and request pathways.

---

## 1. High-Level System Architecture

Pineapple is built as a multi-client application backed by a unified Express API and database engine. 

```
                               ┌────────────────────────┐
                               │     Marketing Web      │
                               │    (pineappleweb)      │
                               └────────────────────────┘
                               
┌────────────────────────┐     ┌────────────────────────┐     ┌────────────────────────┐
│     Boys Mobile App    │     │    Girls Mobile App    │     │    Admin Dashboard     │
│   (Android/iOS Clones) │     │  (Android/iOS Clones)  │     │   (backend/admin)      │
└───────────┬────────────┘     └───────────┬────────────┘     └───────────┬────────────┘
            │                              │                              │
            │ HTTP REST / Socket.IO        │ HTTP REST / Socket.IO        │ HTTP REST
            └────────────────────────┐     │                              │
                                     ▼     ▼                              │
                               ┌───────────┴──────────────────────────────┴┐
                               │            Express API Backend            │
                               │                 (backend)                 │
                               └─────────────────────┬─────────────────────┘
                                                     │
                                                     ├─► Database [MySQL / TiDB]
                                                     │
                                                     ├─► Signaling [Socket.IO]
                                                     │
                                                     ├─► Media [Cloudinary]
                                                     │
                                                     ├─► Notifications [Firebase FCM]
                                                     │
                                                     ├─► Streams [Agora RTC SDK]
                                                     │
                                                     └─► Payments [Razorpay Gateway]
```

---

## 2. Request Flow Example: Buying Coins

Below is a trace of the transaction lifecycle when a user ("boy") purchases a coin pack:

```mermaid
sequenceDiagram
    autonumber
    actor Boy as Boys Client App
    participant Server as Express Backend
    participant Gate as Razorpay API
    participant DB as MySQL DB
    
    Note over Boy: Select package (e.g. ₹100 for 120 Coins)
    Boy->>Server: POST /payment/create-order { packageId: 'pack_100' }
    Server->>Gate: Create Order request (keys in .env)
    Gate-->>Server: Return order metadata (id, amount)
    Server->>DB: Write log to wallet_transactions (type='pending')
    Server-->>Boy: Return Order ID (rzp_order_...)
    
    Note over Boy: Open Razorpay native checkout sheet
    Boy->>Gate: Submit card / UPI credentials
    Gate-->>Boy: Return payment confirmation signature
    
    Boy->>Server: POST /payment/verify { razorpay_payment_id, signature }
    Note over Server: Verify Razorpay signature authenticity
    Server->>DB: UPDATE users SET minutes=minutes+120 (credits coins)
    Server->>DB: UPDATE wallet_transactions SET status='success'
    Server-->>Boy: Return Success Response { success: true, coins: updatedBalance }
    Note over Boy: Render Coin Balance updated in Profile tab
```

### Trace Details in the Code:
1.  **Checkout Initialization**: The client triggers `createPaymentOrder(packageId)` inside `api.js`, calling `POST /payment/create-order`.
2.  **Order Registration**: The backend controller [`backend/src/routes/payment.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/payment.js) instantiates a `Razorpay` client using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. It queries the selected package cost from the `coin_packages` table and initiates a Razorpay checkout request.
3.  **Balance Credit**: Once payment succeeds, the client posts verification parameters to `POST /payment/verify`. The backend verifies signature integrity using standard crypto HMAC hashes. Upon validation, it runs SQL queries to add coins to the user's account (`UPDATE users SET minutes=minutes+? WHERE id=?`).
