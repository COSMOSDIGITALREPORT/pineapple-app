const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const pool = require('./db');

let initialized = false;

function init() {
  if (initialized) return;

  // 1. Try environment variables
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== 'your_project_id') {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        }),
      });
      initialized = true;
      return;
    } catch (e) {
      console.warn('[FCM] Env init failed, checking JSON file fallback:', e.message);
    }
  }

  // 2. Try JSON service account files
  const candidates = [
    path.join(__dirname, '../../../pineapple-8376c-firebase-adminsdk-fbsvc-a742b2a08a.json'),
    path.join(__dirname, '../../cpanel_deploy/api/firebase_credentials.json'),
    path.join(__dirname, '../firebase_credentials.json'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        const creds = JSON.parse(fs.readFileSync(c, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(creds),
        });
        initialized = true;
        console.log('[FCM] Initialized with credentials file:', path.basename(c));
        return;
      } catch (e) {
        console.warn('[FCM] File init failed for', c, e.message);
      }
    }
  }

  console.warn('[FCM] Firebase not configured — push notifications disabled');
}

async function sendPush(token, { title, body, data = {} }) {
  init();
  if (!initialized || !token) return;
  try {
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: (data && data.type === 'incoming_call') ? 'pineapple_calls_channel' : 'pineapple_default_channel',
        },
      },
    });
  } catch (e) {
    console.error('[FCM] send error:', e.message);
  }
}

async function sendPushToUser(userId, { title, body, data = {} }) {
  try {
    const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id=?', [userId]);
    if (rows[0]?.fcm_token) {
      await sendPush(rows[0].fcm_token, { title, body, data });
    }
  } catch (e) {
    console.error('[FCM] sendPushToUser error:', e.message);
  }
}

module.exports = { sendPush, sendPushToUser };

