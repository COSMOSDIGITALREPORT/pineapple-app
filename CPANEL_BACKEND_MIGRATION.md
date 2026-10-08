# Pineapple App — cPanel Hosting, PHP Backend & SQLite Database Migration Guide

This document provides a comprehensive handover for developers and AI agents continuing work on the **Pineapple App** (Web Admin, Android, and iOS).

---

## 1. Architecture Overview

- **Hosting Environment**: AmbitionHost cPanel shared hosting (Zero-terminal, zero manual database configuration).
- **Subdomain**: `admin.pineapplemeetups.com`
- **Frontend**: Single-Page Application (HTML5 / Vanilla JS / CSS) served from root `index.html` with `.htaccess` fallback.
- **Backend**: Modular PHP 8.x REST API inside `/api/` (Entry point: `api/index.php`).
- **Database**: Embedded SQLite via PHP PDO at `api/pineapple.sqlite`.
- **Third-Party Services**:
  - **Agora RTC**: Audio & video call token generation & media streaming.
  - **Firebase Realtime Database**: Realtime signaling for call events (`call:request`, `call:accept`, `call:hangup`, etc.) eliminating server WebSocket daemon requirements.
  - **Fast2SMS / 2Factor**: Dual-gateway SMS OTP delivery for admin security and phone verification.

---

## 2. Database Migration & Data Integrity

The historical database was migrated from Cloud MySQL / TiDB to `api/pineapple.sqlite`.

### User Integrity (Strictly 2 Real Users)
All dummy placeholder test accounts (`User #1` through `User #6`) have been purged. The database strictly contains the **2 valid user accounts**:
1. 👦 **Him** (Boy · Phone: `9146773564` · Coins: `550` · Minutes: `50` · ID: `7ae761ef-454b-4a99-9468-b580708f6318`)
2. 👧 **Kiara** (Girl Host · Phone: `7822839072` · Coins: `500` · Minutes: `232` · ID: `ca00c738-78cd-404b-89b9-f695f543da6f`)

### Real Historical Data Counts in SQLite:
- **Calls**: 108 records (55 ended calls with minutes deducted, audio/video types, earnings, and platform revenue).
- **Wallet Transactions**: 106 records (coin purchases, gifts, trial grants, host earnings).
- **Host Earnings**: 51 earnings records totaling ₹411.00 gross earnings for Kiara.
- **Gifts**: 18 gift logs (Rose, Chocolate, Pastry, Perfume) totaling 780 coins.
- **Withdrawals**: 1 processed withdrawal record (₹295.05 disbursed to Kiara; remaining unpaid balance ₹115.95).
- **Ratings & Reviews**: 17 user reviews with star ratings and feedback tags.
- **Support Messages**: 33 support chat messages (categorized by user, bot auto-reply, and admin).
- **Lucky Wheel Spins**: 15 spin history records.

*Note: In `api/db.php`, `seedInitialHosts` has been permanently disabled so that demo profiles are never auto-generated.*

---

## 3. Admin Panel Security & Authentication

- **Registered Admin Phone**: Locked strictly to `+91 7020768849`.
- **SMS OTP Delivery**: Automated dual-gateway dispatch via Fast2SMS with 2Factor fallback.
- **OTP Login**: Admins can log in via 6-digit SMS OTP without remembering the password.
- **Forgot Password Flow**: Admins can reset their password on the login screen by verifying an OTP sent to `7020768849`.
- **Password Storage**: Dynamically persisted in the `admin_settings` table in SQLite (`admin_password` and `admin_phone`).

---

## 4. Financials & Economics Module (`/admin/financials`)

The financial engine implements the platform's golden rule of circulation:
- **Coins Purchased (Inflow)**: Real cash collected upfront from boys.
- **Coins Consumed (Outflow)**: 70% goes to Host Girl wallet (INR payout eligible), 30% is Platform Net Profit.
- **Marketing / Free Trial Coins (`free_trial`)**:
  - Admin can grant coins to boys directly from the Users section (`+Coins` button).
  - When used by a boy to call a host, the 70% host earnings are tracked as a **Platform Marketing / Acquisition Cost**.
  - New card added in Economics: `🎁 Free Trial Given (Platform Borne)`.
  - New tab added in Ledger: `🎁 Free Trial Coins` (`lt-free_trial`).
- **Won Gifts / Spin Free Coins (`spin_gift`)**:
  - Won from the Fortune Wheel at ₹0 cost to the user.
  - Tracked separately with **₹0 Cash Outflow** so unbacked cash liabilities are prevented.
  - New card added in Economics: `🎡 Won Gifts / Spins (Zero Payout Needed)`.
  - New tab added in Ledger: `🎡 Won Gifts / Spins` (`lt-spin_gift`).

---

## 5. Deployment Instructions for cPanel

The deployable package is located at `deploy.zip` in the project root.

To deploy on AmbitionHost / cPanel:
1. Open cPanel File Manager and navigate to the subdomain document root (e.g. `public_html/admin.pineapplemeetups.com`).
2. Upload `deploy.zip` and click **Extract**.
3. Ensure `.htaccess` is present and permissions are set:
   - Folders: `755`
   - Files: `644`
   - SQLite file (`api/pineapple.sqlite`): writeable by web server (`664` or `666`).
4. Access `https://admin.pineapplemeetups.com`.

---

## 6. Testing iOS / Android Apps

When pulling this repository to macOS for iOS app testing:
- **Base API URL**: Set `API_BASE_URL` in the mobile app environment to `https://admin.pineapplemeetups.com/api`.
- **Call Signaling**: Verify Firebase Realtime Database credentials match across iOS, Android, and web.
- **Valid Test Users**:
  - Boy test login: `+91 9146773564` (Him)
  - Girl host test login: `+91 7822839072` (Kiara)
