# 06. Backend API Catalogue

The backend is built with Express routing, with entry points mapped inside [`backend/src/index.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/index.js).

---

## 1. Middleware & Authentication Guards

Authentication is handled via JSON Web Tokens (JWT). The user signs in and receives a token, which must be attached as a bearer header: `Authorization: Bearer <JWT_TOKEN>`.

*   **User Auth Middleware (`backend/src/middleware/auth.js`)**:
    *   Decodes the JWT token from the Authorization header using `process.env.JWT_SECRET`.
    *   Attaches the decoded object (`userId`) to the request object: `req.user = decoded`.
    *   If missing or invalid, immediately returns `401 Unauthorized`.
*   **Admin Auth Middleware (`backend/src/routes/admin.js`)**:
    *   Decodes the token and checks if `decoded.isAdmin` is set to `true`.
    *   If missing or not an admin, returns `403 Forbidden`.

---

## 2. API Routes Catalog

### 2.1 Authentication (`/auth`)
*   `POST /auth/send-otp`
    *   **Purpose**: Generates a 4-digit OTP and sends it via SMS/Voice (using Fast2SMS or 2Factor.in).
    *   **Auth Required**: No.
    *   **Body**: `{ phone }`
*   `POST /auth/verify-otp`
    *   **Purpose**: Validates the OTP. If valid, registers a new user or signs in an existing user.
    *   **Auth Required**: No.
    *   **Body**: `{ phone, otp, gender, dob }`
    *   **Response**: `{ token, user, isNewUser }`
*   `POST /auth/firebase-login`
    *   **Purpose**: Verifies a Firebase ID token for phone numbers.
    *   **Auth Required**: No.
    *   **Body**: `{ idToken, gender }`
*   `POST /auth/google`
    *   **Purpose**: Verifies a Google Firebase ID token. Registers them as a "boy" by default.
    *   **Auth Required**: No.
    *   **Body**: `{ idToken }`
*   `POST /auth/fcm-token`
    *   **Purpose**: Saves the user's FCM push token for offline call routing.
    *   **Auth Required**: Yes.
    *   **Body**: `{ fcmToken }`

### 2.2 Users & Profiles (`/users`)
*   `GET /users/me`
    *   **Purpose**: Gets the profile of the logged-in user (including coin balance).
    *   **Auth Required**: Yes.
*   `PUT /users/me`
    *   **Purpose**: Updates profile details (name, city, language, bio).
    *   **Auth Required**: Yes.
    *   **Body**: `{ name, city, language, bio }`
*   `PUT /users/me/offline`
    *   **Purpose**: Forcefully marks the user's status as offline (`is_online=0`).
    *   **Auth Required**: Yes.
*   `GET /users/live`
    *   **Purpose**: Fetches active girls who are online and verified.
    *   **Auth Required**: Yes.
*   `GET /users/top`
    *   **Purpose**: Leaderboard listing top-rated verified girls.
    *   **Auth Required**: No.
*   `POST /users/:id/rate`
    *   **Purpose**: Rates a host post-call (1-5 stars, tags, text).
    *   **Auth Required**: Yes.
    *   **Body**: `{ stars, callId, review, tags }`
*   `POST /users/:id/report`
    *   **Purpose**: Files a complaint against a user profile.
    *   **Auth Required**: Yes.
    *   **Body**: `{ reason }`
*   `POST /users/:id/block`
    *   **Purpose**: Blocks another user.
    *   **Auth Required**: Yes.
*   `DELETE /users/:id/block`
    *   **Purpose**: Unblocks a blocked user.
    *   **Auth Required**: Yes.
*   `GET /users/blocked`
    *   **Purpose**: Lists blocked user IDs.
    *   **Auth Required**: Yes.
*   `DELETE /users/me`
    *   **Purpose**: Deletes the user's own account.
    *   **Auth Required**: Yes.

### 2.3 Audio/Video Calls (`/calls`)
*   `POST /calls/initiate`
    *   **Purpose**: Initiates a 1-on-1 call. Generates Agora RTC credentials.
    *   **Auth Required**: Yes.
    *   **Body**: `{ receiverId, type }` (type: `'audio'` or `'video'`)
    *   **Response**: `{ callId, channelName, token }` (returns token for caller)
*   `GET /calls/:id/receiver-token`
    *   **Purpose**: Retrieves the Agora token for the receiver device.
    *   **Auth Required**: Yes.
*   `PUT /calls/:id/end`
    *   **Purpose**: Ends the call, updates duration, deducts coins from the caller, and adds earnings to the receiver.
    *   **Auth Required**: Yes.
    *   **Body**: `{ duration }` (in seconds)
*   `GET /calls/history`
    *   **Purpose**: Fetches the last 30 call logs of the user.
    *   **Auth Required**: Yes.

### 2.4 Live Audio Rooms (`/rooms`)
*   `GET /rooms`
    *   **Purpose**: Fetches active live group rooms.
    *   **Auth Required**: Yes.
*   `POST /rooms`
    *   **Purpose**: Creates a live audio room.
    *   **Auth Required**: Yes.
    *   **Body**: `{ name, topic, language }`
*   `POST /rooms/:id/join`
    *   **Purpose**: Registers user as joined inside a room.
    *   **Auth Required**: Yes.
*   `POST /rooms/:id/leave`
    *   **Purpose**: Registers user as left from a room.
    *   **Auth Required**: Yes.
*   `DELETE /rooms/:id`
    *   **Purpose**: Closes a room (only host/owner can delete).
    *   **Auth Required**: Yes.

### 2.5 Wallet & Monetization (`/wallet` & `/spin`)
*   `GET /wallet`
    *   **Purpose**: Fetches wallet balance and transaction ledger history.
    *   **Auth Required**: Yes.
*   `POST /wallet/gift`
    *   **Purpose**: Spends coins to send a virtual gift to a host.
    *   **Auth Required**: Yes.
    *   **Body**: `{ receiverId, giftType, coinsCost }`
*   `POST /wallet/redeem-gift`
    *   **Purpose**: Converts gift coins to standard balance coins.
    *   **Auth Required**: Yes.
*   `GET /spin/status`
    *   **Purpose**: Checks if the Lucky Spin game is available.
    *   **Auth Required**: Yes.
*   `POST /spin`
    *   **Purpose**: Spins the lucky wheel and picks a weighted random prize.
    *   **Auth Required**: Yes.

### 2.6 Payments (`/payment`)
*   `POST /payment/create-order`
    *   **Purpose**: Creates a Razorpay order ID.
    *   **Auth Required**: Yes.
    *   **Body**: `{ packageId }` (e.g. `'pack_100'`)
*   `POST /payment/verify`
    *   **Purpose**: Verifies Razorpay signature and credits coins.
    *   **Auth Required**: Yes.
    *   **Body**: `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`

### 2.7 Earnings (`/earnings`)
*   `GET /earnings/stats`
    *   **Purpose**: Fetches total calls, minutes called, total coins earned, and current INR balance.
    *   **Auth Required**: Yes.
*   `POST /earnings/withdraw`
    *   **Purpose**: Requests a UPI payout.
    *   **Auth Required**: Yes.
    *   **Body**: `{ amount, upiId }`

### 2.8 Uploads (`/upload`)
*   `POST /upload/avatar`
    *   **Purpose**: Uploads user profile photo to Cloudinary.
    *   **Auth Required**: Yes.
    *   **Body**: FormData file key `'photo'`
    *   **Response**: `{ url }`

### 2.9 Razorpay Webhooks (`/webhook`)
*   `POST /webhook/razorpay`
    *   **Purpose**: Handles payment success notifications from Razorpay servers.
    *   **Auth Required**: No (verified via Razorpay webhook signature header).
