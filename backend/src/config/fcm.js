const admin = require('firebase-admin');

let initialized = false;

function init() {
  if (initialized) return;
  if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your_project_id') {
    console.warn('[FCM] Firebase not configured — push notifications disabled');
    return;
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
}

async function sendPush(token, { title, body, data = {} }) {
  init();
  if (!initialized) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      android: { priority: 'high', notification: { sound: 'default' } },
    });
  } catch (e) {
    console.error('[FCM] send error:', e.message);
  }
}

module.exports = { sendPush };
