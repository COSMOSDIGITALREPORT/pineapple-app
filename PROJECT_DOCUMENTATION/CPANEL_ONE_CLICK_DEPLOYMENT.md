# 🚀 Pineapple App — AmbitionHost cPanel 1-Click Deployment Guide

> **Zero Terminal Commands & Zero Database Setup Required**  
> Architecture: **Static React Admin Dashboard + Modular PHP REST API + SQLite Auto-WAL + Firebase Realtime Signaling**  
> Output Package: `deploy.zip` (2.1 MB)

---

## 1. 📦 What's Inside `deploy.zip`?

| File / Folder | Role & Description |
| :--- | :--- |
| **`index.html`** | Complete Pineapple Admin Dashboard (Stats, Users, Withdrawals, Economics, Reviews). |
| **`.htaccess`** | Handles CORS, blocks direct access to `.sqlite` files, passes `/api/*` to PHP, and routes to SPA. |
| **`api/index.php`** | Master REST router for `/api/auth`, `/api/users`, `/api/calls`, `/api/wallet`, `/api/admin`, etc. |
| **`api/db.php`** | **Auto-Database Initializer**: Automatically creates `pineapple.sqlite` and all 11 tables with `CREATE TABLE IF NOT EXISTS` on the first request. Pre-seeds initial verified host profiles! |
| **`api/firebase.php`** | Real-time signaling bridge: pushes incoming call rings, accepts, and hangups directly to Firebase Realtime Database. |
| **`api/jwt.php`** | Pure PHP JWT authentication (HMAC-SHA256, zero external dependencies). |
| **`api/modules/`** | Modular handlers: `auth.php` (with cross-gender isolation), `calls.php`, `users.php`, `wallet.php`, `earnings.php`, `withdrawals.php`, `spin.php`, `admin.php`, `support.php`, `upload.php`. |
| **`uploads/`** | Local avatar & media upload directory on disk (replaces Cloudinary). |

---

## 2. 🖱️ How to Deploy on AmbitionHost cPanel (Step-by-Step)

### Step 1: Open cPanel File Manager
1. Log in to your **AmbitionHost cPanel**.
2. Click **File Manager**.
3. Navigate to your website's root folder:
   * Main domain: `public_html/`
   * Subdomain (e.g., `api.yourdomain.com`): `public_html/api/` or subdomain directory.

### Step 2: Upload & Extract `deploy.zip`
1. Click **Upload** in the top toolbar.
2. Select the [`deploy.zip`](file:///d:/cosmos%20internship/pineapple-app/deploy.zip) file from your computer.
3. Once the progress bar turns green (100%), return to File Manager.
4. Right-click `deploy.zip` and select **Extract**.
5. Click **Extract Files**.
6. Delete `deploy.zip` to save space.

### Step 3: Verify Your Deployment
Open your browser and visit:
* **Admin Dashboard:** `https://yourdomain.com/` (or `https://yourdomain.com/index.html`)  
  * Password: `Pineapple@2024`
* **Health Check API:** `https://yourdomain.com/api/health`  
  * Returns: `{"status":"ok","platform":"Pineapple cPanel PHP Engine","database":"SQLite Auto-WAL","signaling":"Firebase Realtime Database"}`

---

## 3. 📱 Connecting Mobile Apps to Your cPanel URL

In your mobile applications ([`pineappleandroidboys/src/services/api.js`](file:///d:/cosmos%20internship/pineapple-app/pineappleandroidboys/src/services/api.js), [`pineappleandroidgirls/src/services/api.js`](file:///d:/cosmos%20internship/pineapple-app/pineappleandroidgirls/src/services/api.js), [`pineappleios/src/services/api.js`](file:///d:/cosmos%20internship/pineapple-app/pineappleios/src/services/api.js), [`pineapplegirlsios/src/services/api.js`](file:///d:/cosmos%20internship/pineapple-app/pineapplegirlsios/src/services/api.js)):

Simply update `BASE_URL` from the old Render link to your cPanel domain:
```javascript
const BASE_URL = 'https://yourdomain.com/api';
```

---

## 4. 🔄 Rebuilding `deploy.zip` in Future

If you ever make changes to any PHP module or the Admin Dashboard in the future:
1. Double-click [`build_cpanel_deploy.bat`](file:///d:/cosmos%20internship/pineapple-app/build_cpanel_deploy.bat) in the root directory.
2. It will automatically regenerate an updated `deploy.zip` in seconds!
