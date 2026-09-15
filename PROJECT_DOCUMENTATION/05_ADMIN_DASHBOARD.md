# 05. Admin Dashboard

The Admin Dashboard is built as a Single-Page Application (SPA) client interface located inside the backend directory: [`backend/admin/index.html`](file:///d:/cosmos%20internship/pineapple-app/backend/admin/index.html).

---

## 1. Authentication & Security
*   **Sign-In Route**: `/admin/login` (POST)
*   **Credential Source**: `ADMIN_PASSWORD` (loaded from server `.env`).
*   **Session Management**: Generates a standard JWT token containing `isAdmin: true` signed with `JWT_SECRET`. The client stores this in `localStorage` under `adm_tok` and passes it in the `Authorization: Bearer <token>` header for all subsequent API requests.
*   **Authorization Guard**: The backend uses the `adminAuth` middleware inside [`backend/src/routes/admin.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/admin.js) to reject unauthenticated requests.

---

## 2. Dashboard Modules & Status Matrix

Below is a detailed inventory of the Admin dashboard modules, their backend routes, database interactions, and active implementation statuses:

| Module | Route / Endpoint | Description | DB Tables Involved | Implementation Status |
| :--- | :--- | :--- | :--- | :---: |
| **System Stats** | `GET /admin/stats` | Returns total users, online counts, call counters, pending withdrawals, and pending verifications. | `users`, `calls`, `withdrawals`, `reports` | **IMPLEMENTED** |
| **User Listing** | `GET /admin/users` | Lists registered users (name, phone, gender, coins, premium status, ratings). | `users` | **IMPLEMENTED** |
| **User Suspension** | `PUT /admin/users/:id/block` | Toggles user status between active and suspended (`is_blocked` field in database). | `users` | **IMPLEMENTED** |
| **Balance Management** | `PUT /admin/users/:id/coins` | Manually increments user wallet coin balance (`minutes` database field). | `users` | **IMPLEMENTED** |
| **Account Deletion** | `DELETE /admin/users/:id` | Permanently deletes a user profile from the database. | `users` | **IMPLEMENTED** |
| **Host Verification** | `GET /admin/users/pending` | Lists female hosts that signed up but are not verified yet (`is_verified=0`). | `users` | **IMPLEMENTED** |
| **Profile Approval** | `PUT /admin/users/:id/verify` | Approves or rejects a host's profile. Verification makes them visible to boys. | `users` | **IMPLEMENTED** |
| **Withdrawal Processing** | `GET /admin/withdrawals` | Lists cash-out requests, UPI details, and payout amounts. | `withdrawals` | **IMPLEMENTED** (UI + DB logic) |
| **Payout Actions** | `PUT /admin/withdrawals/:id` | Approves or rejects a pending withdrawal (marks state as `approved` or `rejected`). | `withdrawals` | **IMPLEMENTED** |
| **Reports Console** | `GET /admin/reports` | Lists pending flags from users reporting profile violations. | `reports` | **IMPLEMENTED** |
| **Report Resolution** | `PUT /admin/reports/:id` | Updates a report's status to `resolved` or `actioned`. | `reports` | **IMPLEMENTED** |
| **Call Audit Logs** | `GET /admin/calls` | Lists the most recent 100 calls, types, durations, and coins deducted. | `calls`, `users` | **IMPLEMENTED** |
| **User Reviews Audit** | `GET /admin/reviews` | Displays ratings and review comments submitted by users after calls. | `user_ratings`, `users` | **IMPLEMENTED** |
| **Demo Seeding** | `POST /admin/seed-girls` | Idempotent script to seed test host profiles for testing. | `users`, `calls` | **IMPLEMENTED** |

---

## 3. Discrepancy & Verification Notes

*   **Host Verification**: The Product Brief claims the verification flow is missing (*"admin approval workflow nahi bana"*). However, code audits of [`backend/src/routes/admin.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/routes/admin.js) and `backend/admin/index.html` reveal that the pending profile query, approval state update, and verification filters inside `/users/live` are **fully written, wired, and functional**.
*   **Manual Withdrawals**: Payout approval transitions the database record state to `approved`, but does **not** automatically execute a bank transfer or UPI payout. The admin must perform the transfer manually via a bank app and then click "Approve" in the dashboard. Automating this via Razorpay Payouts is marked as **NOT IMPLEMENTED** (future roadmap).
