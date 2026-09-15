# 10. Environment Variables Configuration

This document lists all the environment configuration variables utilized by the system.

> [!WARNING]
> Environment values are masked to protect system credentials. Do not write or commit actual key values to version control.

---

## 1. Environment Variables Matrix

The following configuration parameters are read from the [`backend/.env`](file:///d:/cosmos%20internship/pineapple-app/backend/.env) file:

| Variable Name | Component | Purpose | Required? | Present? |
| :--- | :--- | :--- | :---: | :---: |
| **`DB_HOST`** | Database Connection | MySQL host URL (e.g. `localhost`). | Yes | **Yes** |
| **`DB_PORT`** | Database Connection | MySQL port key (default `3306`). | Yes | **Yes** |
| **`DB_USER`** | Database Connection | Database user account name. | Yes | **Yes** |
| **`DB_PASS`** | Database Connection | Database password token. | Yes | **Yes** |
| **`DB_NAME`** | Database Connection | Target database name (`pineapple`). | Yes | **Yes** |
| **`AGORA_APP_ID`** | Agora Streaming | RTC App Identifier. | Yes | **Yes** |
| **`AGORA_APP_CERTIFICATE`** | Agora Streaming | Auth key to generate voice/video call tokens. | Yes | **Yes** |
| **`RAZORPAY_KEY_ID`** | Razorpay Payments | Public key ID for checkout orders. | Yes | **Yes** |
| **`RAZORPAY_KEY_SECRET`** | Razorpay Payments | Verification secret for transaction signatures. | Yes | **Yes** |
| **`CLOUDINARY_CLOUD_NAME`** | Cloudinary CDN | Cloud Storage bucket name. | Yes | **Yes** |
| **`CLOUDINARY_API_KEY`** | Cloudinary CDN | Image uploading API token. | Yes | **Yes** |
| **`CLOUDINARY_API_SECRET`** | Cloudinary CDN | Cloudinary private secret. | Yes | **Yes** |
| **`FAST2SMS_API_KEY`** | Fast2SMS | Sends SMS verification numbers. | Yes | **Yes** |
| **`TWOFACTOR_API_KEY`** | 2Factor.in | Voice call phone authentication client key. | Yes | **Yes** |
| **`JWT_SECRET`** | Session Security | Signs auth tokens issued to clients. | Yes | **Yes** |
| **`ADMIN_PASSWORD`** | Admin Dashboard | Password to log in to the admin console dashboard. | Yes | **Yes** |
| **`FIREBASE_SERVICE_ACCOUNT`**| Firebase FCM | Optional JSON string containing the credential token. | No | **No** (Uses local JSON file instead) |
| **`PORT`** | Server Runtime | Port the server listens on (defaults to `3000`). | No | **No** (Defaults to 3000) |

---

## 2. Discrepancies / Code Reference Audit

*   **`DB_SSL`**: The file [`backend/src/config/db.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/config/db.js) references `process.env.DB_SSL`. If this is configured, it forces SSL client encryption. It is **missing** from `.env`, but fallback default sets it to local non-encrypted connections, which works fine on development setups.
