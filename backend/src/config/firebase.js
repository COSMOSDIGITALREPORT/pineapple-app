const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let serviceAccount = null;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    const filePath = path.resolve(__dirname, '../../../pineapple-8376c-firebase-adminsdk-fbsvc-a742b2a08a.json');
    if (fs.existsSync(filePath)) {
      serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  }
} catch (e) {
  console.error('[FIREBASE] Failed to parse service account:', e.message);
}

if (serviceAccount) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('[FIREBASE] Admin initialized');
} else {
  console.warn('[FIREBASE] No service account — Firebase Auth disabled');
}

module.exports = admin;
