const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool    = require('../config/db');
const axios   = require('axios');
const fast2sms = require('../config/fast2sms');

// Known Indian temp/VoIP number prefixes to block
const BLOCKED_PREFIXES = ['700','701','702','703','704'];
// Indian real mobile: 6,7,8,9 — 10 digits
function isValidIndianMobile(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}
function isTempNumber(phone) {
  // Block known VoIP/temp prefixes
  return BLOCKED_PREFIXES.some(p => phone.startsWith(p));
}

router.post('/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone || !isValidIndianMobile(phone))
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  if (isTempNumber(phone))
    return res.status(400).json({ error: 'Temporary or VoIP numbers are not allowed.' });

  try {
    // Rate limit: max 3 OTPs per number in 10 minutes
    const [recent] = await pool.query(
      'SELECT COUNT(*) as cnt FROM otp_sessions WHERE phone=? AND created_at > NOW() - INTERVAL 10 MINUTE',
      [phone]);
    if (recent[0].cnt >= 3)
      return res.status(429).json({ error: 'Too many OTP requests. Please wait 10 minutes.' });
  } catch (err) { console.error('rate-limit check:', err.message); }

  const otp       = Math.floor(1000 + Math.random() * 9000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  try {
    await pool.query('INSERT INTO otp_sessions (id, phone, otp, expires_at) VALUES (?, ?, ?, ?)',
      [uuidv4(), phone, otp, expiresAt]);
    console.log(`[DEV] OTP for ${phone}: ${otp}`);

    // Send OTP via voice call (2Factor)
    if (process.env.TWOFACTOR_API_KEY) {
      try {
        const voiceRes = await axios.get(
          `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/VOICE/${phone}/${otp}`
        );
        console.log('[2FACTOR VOICE] Sent:', voiceRes.data);
      } catch (err) {
        console.error('[2FACTOR VOICE] Failed:', err.response?.data || err.message);
      }
    } else {
      console.warn('[VOICE] No API key configured. OTP not sent.');
    }

    res.json({ success: true });
  } catch (err) { console.error('send-otp:', err.message); res.status(500).json({ error: 'Failed to send OTP' }); }
});

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function validateAge(dob, gender) {
  const age = calcAge(dob);
  if (!age) return null;
  const g = (gender || '').toLowerCase();
  const isBoy = ['boy','male','m'].includes(g);
  const isGirl = ['girl','female','f'].includes(g);
  if (age < 18) return 'You must be 18 or older to use Pineapple.';
  if (isGirl && age > 35) return 'Girls aged 18–35 can use Pineapple.';
  if (isBoy && age > 45) return 'Boys aged 18–45 can use Pineapple.';
  return null;
}

router.post('/verify-otp', async (req, res) => {
  const { phone, otp, gender, dob } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });
  if (!isValidIndianMobile(phone))
    return res.status(400).json({ error: 'Invalid phone number.' });

  try {
    const [sessions] = await pool.query(
      'SELECT * FROM otp_sessions WHERE phone=? AND otp=? AND is_used=0 AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1',
      [phone, otp]);
    if (!sessions.length) return res.status(400).json({ error: 'Invalid or expired OTP' });
    await pool.query('UPDATE otp_sessions SET is_used=1 WHERE id=?', [sessions[0].id]);

    const [existing] = await pool.query('SELECT * FROM users WHERE phone=?', [phone]);
    let user;
    if (existing.length) {
      // existing user — check if blocked
      if (existing[0].is_blocked)
        return res.status(403).json({ error: 'Your account has been suspended.' });
      // age check if dob provided on re-login
      const userDob = dob || existing[0].dob;
      const userGender = gender || existing[0].gender;
      const ageErr = validateAge(userDob, userGender);
      if (ageErr) return res.status(400).json({ error: ageErr });

      await pool.query('UPDATE users SET last_seen=NOW(), is_online=1, gender=COALESCE(NULLIF(?,""),gender) WHERE phone=?', [gender||'', phone]);
      const [r] = await pool.query('SELECT * FROM users WHERE phone=?', [phone]);
      user = r[0];
    } else {
      // new user
      const ageErr = validateAge(dob, gender);
      if (ageErr) return res.status(400).json({ error: ageErr });
      const id = uuidv4();
      await pool.query('INSERT INTO users (id,phone,gender,dob,minutes) VALUES (?,?,?,?,3)', [id, phone, gender||null, dob||null]);
      const [r] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
      user = r[0];
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    user.coins = user.minutes ?? 0;
    res.json({ token, user, isNewUser: !user.name });
  } catch (err) { console.error('verify-otp:', err.message); res.status(500).json({ error: 'Verification failed' }); }
});

router.post('/firebase-login', async (req, res) => {
  const { idToken, gender } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });
  try {
    const admin = require('../config/firebase');
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase not configured' });
    const decoded = await admin.auth().verifyIdToken(idToken);
    const phone = decoded.phone_number?.replace('+91', '') || decoded.uid.slice(-10);
    if (!isValidIndianMobile(phone))
      return res.status(400).json({ error: 'Invalid phone number.' });
    const [existing] = await pool.query('SELECT * FROM users WHERE phone=?', [phone]);
    let user;
    if (existing.length) {
      if (existing[0].is_blocked)
        return res.status(403).json({ error: 'Your account has been suspended.' });
      await pool.query('UPDATE users SET last_seen=NOW(), is_online=1, gender=COALESCE(NULLIF(?,""),gender) WHERE phone=?', [gender||'', phone]);
      const [r] = await pool.query('SELECT * FROM users WHERE phone=?', [phone]);
      user = r[0];
    } else {
      const id = uuidv4();
      await pool.query('INSERT INTO users (id,phone,gender) VALUES (?,?,?)', [id, phone, gender||null]);
      const [r] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
      user = r[0];
    }
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    user.coins = user.minutes ?? 0;
    res.json({ token, user, isNewUser: !user.name });
  } catch (err) {
    console.error('firebase-login:', err.message);
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
});

// Google Sign-In — verifies Firebase ID token from Google auth
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'idToken required' });
  try {
    const admin = require('../config/firebase');
    if (!admin.apps.length) return res.status(500).json({ error: 'Firebase not configured on server' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    // Find by google_id, fallback to email
    let user;
    let isNewUser = false;
    try {
      const [byGoogle] = await pool.query('SELECT * FROM users WHERE google_id=?', [uid]);
      if (byGoogle.length) {
        user = byGoogle[0];
      } else if (email) {
        const [byEmail] = await pool.query('SELECT * FROM users WHERE email=?', [email]);
        if (byEmail.length) {
          user = byEmail[0];
          await pool.query('UPDATE users SET google_id=? WHERE id=?', [uid, user.id]).catch(() => {});
        }
      }
    } catch { /* columns may not exist yet */ }

    if (!user) {
      isNewUser = true;
      const id = uuidv4();
      try {
        await pool.query(
          'INSERT INTO users (id, name, avatar_url, google_id, email, gender, minutes, is_verified) VALUES (?,?,?,?,?,?,?,?)',
          [id, name || 'User', picture || null, uid, email || null, 'boy', 3, 1]
        );
      } catch {
        await pool.query(
          'INSERT INTO users (id, name, avatar_url, gender, minutes, is_verified) VALUES (?,?,?,?,?,?)',
          [id, name || 'User', picture || null, 'boy', 3, 1]
        );
      }
      const [r] = await pool.query('SELECT * FROM users WHERE id=?', [id]);
      user = r[0];
    }

    if (user?.is_blocked) return res.status(403).json({ error: 'Your account has been suspended.' });
    await pool.query('UPDATE users SET last_seen=NOW(), is_online=1 WHERE id=?', [user.id]).catch(() => {});

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    user.coins = user.minutes ?? 0;
    res.json({ token, user, isNewUser });
  } catch (err) {
    console.error('[GOOGLE AUTH]', err.message);
    res.status(401).json({ error: 'Google sign-in failed. Please try again.' });
  }
});

router.post('/fcm-token', require('../middleware/auth'), async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) return res.status(400).json({ error: 'fcmToken required' });
  try {
    await pool.query('UPDATE users SET fcm_token=? WHERE id=?', [fcmToken, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
