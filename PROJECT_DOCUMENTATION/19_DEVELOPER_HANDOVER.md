# 19. Developer Handover & Onboarding Guide

This guide is designed to help a new developer quickly get up to speed with the project and begin modifying the frontend, backend, or database.

---

## 1. Onboarding Checklist

### 1.1 Modifying the Frontend
*   **Where to start**: Client API methods are configured in [`pineappleios/src/services/api.js`](file:///d:/cosmos%20internship/pineapple-app/pineappleios/src/services/api.js). Screens reside in the `src/screens/` directory.
*   **Screen Addition Flow**:
    1. Create your new screen JSX file inside `src/screens/`.
    2. Register the screen in the navigation handler of your main wrapper view (e.g. `GirlsHomeScreen.jsx` or `MainHomeScreen.jsx`). Add a state variable to handle toggles.
    3. Wire up event listeners and database requests using the functions exported from `api.js`.

### 1.2 Modifying the Backend
*   **Where to start**: Express route handlers are defined in `backend/src/routes/`. The database connection pool is configured in `backend/src/config/db.js`.
*   **Adding an API Endpoint**:
    1. Create or open the relevant router file inside `backend/src/routes/` (e.g., `users.js`).
    2. Write your Express endpoint (e.g., `router.post('/your-route', auth, async (req, res) => { ... })`).
    3. If database access is required, query the database pool using SQL: `await pool.query('SELECT ...')`.
    4. Register the new router inside the main Express app in [`backend/src/index.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/index.js): `app.use('/your-feature', require('./routes/your-file'));`.

### 1.3 Database Changes
*   **How to apply changes**:
    1. Add your DDL commands (e.g., `CREATE TABLE` or `ALTER TABLE`) to [`backend/schema.sql`](file:///d:/cosmos%20internship/pineapple-app/backend/schema.sql).
    2. To make testing easier, add your migration command to the `runMigrations()` function in `backend/src/index.js`. This function automatically runs missing database schema updates when the backend boots.

---

## 2. Architecture Quick Reference

*   **Authentication Flow**:
    *   Authentication is token-based. The backend verifies the token using the `auth` middleware inside `backend/src/middleware/auth.js` and attaches the user payload to `req.user`.
*   **Socket.IO Event Flow**:
    *   Real-time events (incoming call rings, audio room updates, and chat messages) are handled by the Socket.IO listener inside [`backend/src/socket/index.js`](file:///d:/cosmos%20internship/pineapple-app/backend/src/socket/index.js).
*   **Calling Pipeline**:
    *   Calls are initiated via `POST /calls/initiate`.
    *   Stream connections use the Agora WebRTC wrapper inside `VideoCallScreen.jsx` and `AudioCallScreen.jsx`.
    *   Calls are terminated via `PUT /calls/:id/end`, which triggers the coin-to-earnings calculations.

---

## 3. Safe Development Guidelines

*   **Files to Avoid Modifying Directly**:
    *   Do not modify the native build properties inside `android/app/build.gradle` or Xcode configurations unless you are upgrading dependencies or adding native modules.
*   **Generated Folders to Ignore**:
    *   Never commit `node_modules/`, `android/build/`, or `ios/Pods/` folders.
*   **Credentials & Secrets Policy**:
    *   Never commit `.env` files or Firebase SDK credential JSON files.
    *   Always use local variables or secure secret managers to handle API secrets.
