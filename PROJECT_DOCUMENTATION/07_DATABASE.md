# 07. Database Schema

The Pineapple database layer uses **MySQL / TiDB**. It is initialized using the client pool in [`backend/src/config/db.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/db.js).

---

## 1. Table Definitions (From `schema.sql`)

### 1.1 `users`
Stores user profile records for both boys and girls.
*   `id` (CHAR(36)): Primary Key (UUID).
*   `phone` (VARCHAR(15)): Unique, mobile number (e.g. `9999900001`).
*   `name` (VARCHAR(100)): User's name.
*   `dob` (DATE): Date of birth (used for age verification).
*   `gender` (VARCHAR(10)): `'boy'`, `'girl'`, `'male'`, `'female'`.
*   `city` (VARCHAR(100)): User's city.
*   `language` (VARCHAR(50)): Preferred language.
*   `bio` (TEXT): Profile bio description.
*   `avatar_url` (TEXT): CDN link to profile avatar (Cloudinary).
*   `coins` (INT): User's coin balance (defaults to `500` for testing/trial).
*   `is_premium` (TINYINT(1)): Premium membership flag.
*   `is_verified` (TINYINT(1)): Verifies female host profiles. Unverified hosts are hidden.
*   `is_online` (TINYINT(1)): Current Socket.IO connection status.
*   `fcm_token` (TEXT): Device push token.
*   `last_seen` (DATETIME): Timestamp of last active connection.

### 1.2 `otp_sessions`
Handles rate-limited SMS login audits.
*   `id` (CHAR(36)): Primary Key.
*   `phone` (VARCHAR(15)): Destination phone.
*   `otp` (VARCHAR(6)): Code sent.
*   `expires_at` (DATETIME): Expiration threshold.
*   `is_used` (TINYINT(1)): Toggled to `1` upon verify.

### 1.3 `calls`
Details 1-on-1 audio/video call transactions.
*   `id` (CHAR(36)): Primary Key.
*   `caller_id` (CHAR(36)): FK -> `users(id)` (Boy).
*   `receiver_id` (CHAR(36)): FK -> `users(id)` (Girl).
*   `call_type` (VARCHAR(10)): `'audio'` or `'video'`.
*   `status` (VARCHAR(20)): `'initiated'`, `'connected'`, `'ended'`, `'missed'`, `'rejected'`.
*   `started_at` / `ended_at` (DATETIME): Time capture.
*   `duration_seconds` (INT): Total duration.
*   `coins_deducted` (INT): Total coins charged.
*   `agora_channel` (VARCHAR(100)): Unique Agora room channel key.

### 1.4 `wallet_transactions`
General coin ledger tracking purchases, gifts, and spins.
*   `id` (CHAR(36)): Primary Key.
*   `user_id` (CHAR(36)): FK -> `users(id)`.
*   `type` (VARCHAR(20)): `'purchase'`, `'call'`, `'gift'`, `'spin'`, `'redeem'`.
*   `amount` (INT): Coins added (+) or deducted (-).
*   `ref_id` (CHAR(36)): Associated `call_id` or transaction reference.

### 1.5 `earnings`
Tracks earnings credited to hosts for calls.
*   `id` (CHAR(36)): Primary Key.
*   `girl_id` (CHAR(36)): FK -> `users(id)`.
*   `call_id` (CHAR(36)): FK -> `calls(id)`.
*   `coins_received` (INT): Raw coins earned.
*   `amount_inr` (DECIMAL(10,2)): Equivalent currency earned (0.50 INR/coin).
*   `status` (VARCHAR(20)): `'pending'`, `'withdrawn'`, `'cleared'`.

### 1.6 `withdrawals`
Requests submitted by hosts to cash out earnings via UPI.
*   `id` (CHAR(36)): Primary Key.
*   `girl_id` (CHAR(36)): FK -> `users(id)`.
*   `amount` (DECIMAL(10,2)): Requested cash amount in INR.
*   `upi_id` (VARCHAR(100)): Destination UPI identifier.
*   `status` (VARCHAR(20)): `'pending'`, `'approved'`, `'rejected'`.

### 1.7 `rooms` & `room_members`
Audio room parameters.
*   `rooms.id` (CHAR(36)): Primary Key.
*   `rooms.host_id` (CHAR(36)): FK -> `users(id)`.
*   `room_members.room_id` (CHAR(36)): FK -> `rooms(id)`.
*   `room_members.user_id` (CHAR(36)): FK -> `users(id)`.

### 1.8 `gifts`
Logs of digital gifts sent by boys to girls.
*   `id` (CHAR(36)): Primary Key.
*   `sender_id` (CHAR(36)): FK -> `users(id)`.
*   `receiver_id` (CHAR(36)): FK -> `users(id)`.
*   `gift_type` (VARCHAR(50)): e.g. `'rose'`, `'perfume'`, `'diamond'`.
*   `coins_spent` (INT): Cost.

### 1.9 `reports`
Complaints logs.
*   `id` (CHAR(36)): Primary Key.
*   `reporter_id` (CHAR(36)): FK -> `users(id)`.
*   `reported_id` (CHAR(36)): FK -> `users(id)`.
*   `reason` (VARCHAR(200)): Text reason.
*   `status` (VARCHAR(20)): `'pending'`, `'resolved'`, `'actioned'`.

### 1.10 `user_ratings`
Post-call ratings left by users.
*   `id` (CHAR(36)): Primary Key.
*   `rater_id` / `rated_id` (CHAR(36)): FK -> `users(id)`.
*   `stars` (TINYINT): 1 to 5.
*   `review_text` (TEXT): Feedback comments.

---

## 2. Conceptual Schema Relationship

```
  [users] ──(1:N)──> [otp_sessions]
  [users] ──(1:N)──> [wallet_transactions]
  [users] ──(1:N)──> [withdrawals]
  [users] ──(1:N)──> [rooms]
  [users] ──(1:N)──> [spin_history]
  
  [users] (caller) ──(1:N)──> [calls]
  [users] (receiver) ──(1:N)──> [calls]
  
  [users] (sender) ──(1:N)──> [gifts]
  [users] (receiver) ──(1:N)──> [gifts]
  
  [users] (reporter) ──(1:N)──> [reports]
  [users] (reported) ──(1:N)──> [reports]

  [calls] ──(1:1)──> [earnings]
```
