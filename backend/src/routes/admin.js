const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool   = require('../config/db');

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

// POST /admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Wrong password' });
  const token = jwt.sign({ isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// POST /admin/migrate-verification-and-withdrawals — one-off: adds same_day/fee_amount
// columns to withdrawals if missing, and marks all existing girls as verified so the
// new verification gate doesn't hide anyone who was already live before this feature shipped.
router.post('/migrate-verification-and-withdrawals', adminAuth, async (req, res) => {
  const log = [];
  try {
    try {
      await pool.query('ALTER TABLE withdrawals ADD COLUMN same_day TINYINT(1) NOT NULL DEFAULT 0');
      log.push('added same_day column');
    } catch (e) { log.push('same_day column: ' + e.message); }
    try {
      await pool.query('ALTER TABLE withdrawals ADD COLUMN fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0');
      log.push('added fee_amount column');
    } catch (e) { log.push('fee_amount column: ' + e.message); }

    const [result] = await pool.query("UPDATE users SET is_verified=1 WHERE gender='girl' AND is_verified=0");
    log.push(`approved ${result.affectedRows} existing girls`);

    res.json({ success: true, log });
  } catch (err) { res.status(500).json({ error: err.message, log }); }
});

// GET /admin/stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [[users]]   = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [[boys]]    = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender IN ("boy","male")');
    const [[girls]]   = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender IN ("girl","female")');
    const [[online]]  = await pool.query('SELECT COUNT(*) AS total FROM users WHERE is_online=1');
    const [[calls]]   = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(mins_deducted),0) AS total_coins,
              COALESCE(SUM(duration_seconds),0) AS total_secs,
              COALESCE(SUM(platform_revenue_inr),0) AS call_platform_rev,
              COALESCE(SUM(girl_earnings_inr),0) AS call_girl_earnings
       FROM calls WHERE status="ended"`
    );
    const [[earnings]] = await pool.query('SELECT COALESCE(SUM(amount_inr),0) AS total_girl_earned FROM earnings');
    const [[pending]]  = await pool.query('SELECT COUNT(*) AS total, COALESCE(SUM(amount),0) AS total_amount FROM withdrawals WHERE status="pending"');
    const [[reports]]  = await pool.query('SELECT COUNT(*) AS total FROM reports WHERE status="pending"');
    const [[unverified]] = await pool.query('SELECT COUNT(*) AS total FROM users WHERE gender="girl" AND is_verified=0');

    const totalCoinsSpent = Number(calls.total_coins) || 0;
    const totalPlatformCallRev = parseFloat(calls.call_platform_rev) || 0;
    const totalGirlEarnings = parseFloat(earnings.total_girl_earned) || 0;
    const pendingWithdrawalAmount = parseFloat(pending.total_amount) || 0;
    const totalMinsTalked = Math.round((Number(calls.total_secs) || 0) / 60);

    res.json({
      users: users.total,
      boys: boys.total,
      girls: girls.total,
      online: online.total,
      totalCalls: calls.total,
      totalMins: totalMinsTalked,
      totalCoins: totalCoinsSpent,
      platformRevenue: totalPlatformCallRev,
      girlEarnings: totalGirlEarnings,
      pendingWithdrawalAmount,
      pendingWithdrawals: pending.total,
      pendingReports: reports.total,
      pendingVerifications: unverified.total,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id,phone,name,gender,minutes,is_online,is_blocked,is_premium,is_verified,rating,created_at FROM users ORDER BY created_at DESC LIMIT 200');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/users/pending — girls awaiting verification approval
router.get('/users/pending', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id,phone,name,city,language,bio,avatar_url,dob,created_at FROM users
       WHERE gender='girl' AND is_verified=0 ORDER BY created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/verify — approve/reject a girl's profile
router.put('/users/:id/verify', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_verified=? WHERE id=?', [req.body.verify ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/gender — update user gender (boy / girl)
router.put('/users/:id/gender', adminAuth, async (req, res) => {
  const { gender } = req.body;
  if (!gender || !['boy', 'girl', 'male', 'female'].includes(gender.toLowerCase())) {
    return res.status(400).json({ error: 'Valid gender (boy or girl) required' });
  }
  try {
    await pool.query('UPDATE users SET gender=? WHERE id=?', [gender.toLowerCase(), req.params.id]);
    res.json({ success: true, gender: gender.toLowerCase() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/fix-genders — auto-fix any null/missing genders
router.post('/fix-genders', adminAuth, async (req, res) => {
  try {
    const [result] = await pool.query("UPDATE users SET gender='girl' WHERE gender IS NULL OR gender='' OR gender='-'");
    res.json({ success: true, updated: result.affectedRows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/coins — add coins
router.put('/users/:id/coins', adminAuth, async (req, res) => {
  const { coins } = req.body;
  if (!coins || isNaN(coins)) return res.status(400).json({ error: 'coins required' });
  try {
    await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [parseInt(coins), req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/users/:id/block — suspend/unsuspend
router.put('/users/:id/block', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_blocked=? WHERE id=?', [req.body.block ? 1 : 0, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/users/:id — delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/withdrawals
router.get('/withdrawals', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT w.*, u.name, u.phone FROM withdrawals w JOIN users u ON w.girl_id=u.id ORDER BY w.created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/withdrawals/:id — approve/reject
router.put('/withdrawals/:id', adminAuth, async (req, res) => {
  const { status, note } = req.body;
  try {
    await pool.query('UPDATE withdrawals SET status=?, note=? WHERE id=?', [status, note||null, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/reports
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, u1.name AS reporter_name, u2.name AS reported_name
       FROM reports r JOIN users u1 ON r.reporter_id=u1.id JOIN users u2 ON r.reported_id=u2.id
       WHERE r.status="pending" ORDER BY r.created_at DESC`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /admin/reports/:id
router.put('/reports/:id', adminAuth, async (req, res) => {
  try {
    await pool.query('UPDATE reports SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/calls
router.get('/calls', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.call_type, c.duration_seconds, c.mins_deducted,
              COALESCE(c.girl_earnings_inr, 0) AS girl_earnings_inr,
              COALESCE(c.platform_revenue_inr, 0) AS platform_revenue_inr,
              COALESCE(c.free_trial, 0) AS free_trial,
              c.status, c.created_at,
              u1.name AS caller, u2.name AS receiver
       FROM calls c
       LEFT JOIN users u1 ON c.caller_id=u1.id
       LEFT JOIN users u2 ON c.receiver_id=u2.id
       ORDER BY c.created_at DESC LIMIT 100`
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /admin/reviews — girl reviews about boys
router.get('/reviews', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id, r.stars, r.review_text, r.tags, r.created_at,
              rater.name AS rater_name, rater.gender AS rater_gender,
              rated.name AS rated_name, rated.gender AS rated_gender
       FROM user_ratings r
       JOIN users rater ON r.rater_id=rater.id
       JOIN users rated ON r.rated_id=rated.id
       WHERE r.review_text IS NOT NULL AND r.review_text!=''
       ORDER BY r.created_at DESC LIMIT 100`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /admin/seed-girls — one-time seed of demo girl profiles for testing (idempotent by phone prefix)
const SEED_GIRLS = [
  { phone: '9999900001', name: 'Asmi',    city: 'Delhi',     language: 'Hindi',   rating: 4.9, rating_count: 210, is_online: 1, calls: 2100, avatar_url: 'https://i.pravatar.cc/300?img=47' },
  { phone: '9999900002', name: 'Priya',   city: 'Mumbai',    language: 'Hindi',   rating: 4.8, rating_count: 180, is_online: 1, calls: 1800, avatar_url: 'https://i.pravatar.cc/300?img=44' },
  { phone: '9999900003', name: 'Ananya',  city: 'Bangalore', language: 'English', rating: 4.7, rating_count: 150, is_online: 0, calls: 1500, avatar_url: 'https://i.pravatar.cc/300?img=45' },
  { phone: '9999900004', name: 'Kavya',   city: 'Pune',      language: 'Hindi',   rating: 4.6, rating_count: 120, is_online: 1, calls: 1200, avatar_url: 'https://i.pravatar.cc/300?img=48' },
  { phone: '9999900005', name: 'Riya',    city: 'Jaipur',    language: 'Hindi',   rating: 4.5, rating_count: 95,  is_online: 0, calls: 950,  avatar_url: 'https://i.pravatar.cc/300?img=49' },
  { phone: '9999900006', name: 'Sneha',   city: 'Chennai',   language: 'English', rating: 4.4, rating_count: 80,  is_online: 1, calls: 800,  avatar_url: 'https://i.pravatar.cc/300?img=32' },
  { phone: '9999900007', name: 'Isha',    city: 'Kolkata',   language: 'Hindi',   rating: 4.3, rating_count: 60,  is_online: 0, calls: 600,  avatar_url: 'https://i.pravatar.cc/300?img=31' },
  { phone: '9999900008', name: 'Meera',   city: 'Lucknow',   language: 'Hindi',   rating: 4.1, rating_count: 40,  is_online: 1, calls: 400,  avatar_url: 'https://i.pravatar.cc/300?img=30' },
  { phone: '9999900009', name: 'Tara',    city: 'Ahmedabad', language: 'English', rating: 4.0, rating_count: 25,  is_online: 0, calls: 250,  avatar_url: 'https://i.pravatar.cc/300?img=29' },
];

router.post('/seed-girls', adminAuth, async (req, res) => {
  try {
    const created = [];
    for (const g of SEED_GIRLS) {
      const [existing] = await pool.query('SELECT id FROM users WHERE phone=?', [g.phone]);
      let userId;
      if (existing.length) {
        userId = existing[0].id;
        await pool.query(
          `UPDATE users SET name=?, city=?, language=?, gender='girl', rating=?, rating_count=?,
             is_online=?, avatar_url=?, is_verified=1 WHERE id=?`,
          [g.name, g.city, g.language, g.rating, g.rating_count, g.is_online, g.avatar_url, userId]
        );
      } else {
        userId = uuidv4();
        await pool.query(
          `INSERT INTO users (id, phone, name, gender, city, language, rating, rating_count, is_online, avatar_url, is_verified, minutes)
           VALUES (?,?,?,?,?,?,?,?,?,?,1,0)`,
          [userId, g.phone, g.name, 'girl', g.city, g.language, g.rating, g.rating_count, g.is_online, g.avatar_url]
        );
      }
      // Backfill ended calls so calls_count reflects the seeded number (single bulk insert)
      const [[{ cnt }]] = await pool.query(
        "SELECT COUNT(*) AS cnt FROM calls WHERE receiver_id=? AND status='ended'", [userId]
      );
      const toAdd = Math.max(0, g.calls - cnt);
      if (toAdd > 0) {
        const rows = Array.from({ length: toAdd }, () => [uuidv4(), null, userId, 'audio', 'ended', 60]);
        await pool.query(
          `INSERT INTO calls (id, caller_id, receiver_id, call_type, status, duration_seconds) VALUES ?`,
          [rows]
        );
      }
      created.push({ id: userId, name: g.name });
    }
    res.json({ success: true, seeded: created });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /admin/seed-girls — remove the demo girl profiles (and their backfilled calls) added above
router.delete('/seed-girls', adminAuth, async (req, res) => {
  try {
    const removed = [];
    for (const g of SEED_GIRLS) {
      const [existing] = await pool.query('SELECT id FROM users WHERE phone=?', [g.phone]);
      if (!existing.length) continue;
      const userId = existing[0].id;
      await pool.query('DELETE FROM calls WHERE receiver_id=? OR caller_id=?', [userId, userId]);
      await pool.query('DELETE FROM user_ratings WHERE rater_id=? OR rated_id=?', [userId, userId]);
      await pool.query('DELETE FROM users WHERE id=?', [userId]);
      removed.push({ id: userId, name: g.name });
    }
    res.json({ success: true, removed });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
