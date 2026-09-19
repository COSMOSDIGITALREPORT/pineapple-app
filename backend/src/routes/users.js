const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

// Fields safe to expose to other users (no phone, no fcm_token)
const PUBLIC_FIELDS = 'id,name,dob,city,language,bio,avatar_url,is_online,is_premium,plan_id,rating,rating_count,content_prefs';
// Fields for own profile (includes phone for self account view)
const ME_FIELDS     = `${PUBLIC_FIELDS},phone,minutes,is_verified,spin_available,gender,created_at,free_trial_used,intro_9_used`;

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function isHideOnline(prefs) {
  if (!prefs) return false;
  let p = prefs;
  if (typeof p === 'string') {
    try { p = JSON.parse(p); } catch { return false; }
  }
  return !!(p.hideOnline || p.hide_online || p.hideOnlineStatus || p.hide_online_status);
}

router.get('/me', auth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_online=1, last_seen=NOW() WHERE id=?', [req.user.userId]);
    const [rows] = await pool.query(`SELECT ${ME_FIELDS} FROM users WHERE id=?`, [req.user.userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    u.coins = u.minutes ?? 0;
    u.age = calcAge(u.dob);
    u.intro_9_used = !!u.intro_9_used;
    u.intro9Used = !!u.intro_9_used;
    res.set('Cache-Control', 'no-store');
    res.json(u);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/me', auth, async (req, res) => {
  const { name, dob, gender, city, language, bio, avatar_url, content_prefs } = req.body;
  const safeAvatar = avatar_url && !avatar_url.startsWith('file://') ? avatar_url : undefined;

  // Age validation on profile update
  if (dob && gender) {
    const age = calcAge(dob);
    const g = (gender || '').toLowerCase();
    const isGirl = ['girl','female','f'].includes(g);
    const isBoy  = ['boy','male','m'].includes(g);
    if (age < 18) return res.status(400).json({ error: 'Must be 18+ to use Pineapple.' });
    if (isGirl && age > 35) return res.status(400).json({ error: 'Girls aged 18–35 only.' });
    if (isBoy  && age > 45) return res.status(400).json({ error: 'Boys aged 18–45 only.' });
  }

  const prefsJson = content_prefs ? JSON.stringify(content_prefs) : undefined;
  try {
    let q = 'UPDATE users SET name=COALESCE(NULLIF(?,""), name),dob=COALESCE(?, dob),gender=COALESCE(NULLIF(?,""), gender),city=COALESCE(?, city),language=COALESCE(?, language),bio=COALESCE(?, bio),updated_at=NOW()';
    const params = [name, dob||null, gender||null, city||null, language||null, bio||null];
    if (safeAvatar !== undefined) { q += ',avatar_url=?'; params.push(safeAvatar); }
    if (prefsJson  !== undefined) { q += ',content_prefs=?'; params.push(prefsJson); }
    q += ' WHERE id=?'; params.push(req.user.userId);
    await pool.query(q, params);
    const [rows] = await pool.query(`SELECT ${ME_FIELDS} FROM users WHERE id=?`, [req.user.userId]);
    const u = rows[0];
    u.coins = u.minutes ?? 0;
    u.age = calcAge(u.dob);
    u.intro_9_used = !!u.intro_9_used;
    u.intro9Used = !!u.intro_9_used;
    res.json(u);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/live', auth, async (req, res) => {
  try {
    const [me] = await pool.query('SELECT gender,dob FROM users WHERE id=?', [req.user.userId]);
    const raw = me[0]?.gender?.toLowerCase();
    const isBoy  = ['boy','male','m'].includes(raw);
    const isGirl = ['girl','female','f'].includes(raw);
    const variants = isBoy ? ['female','girl','f'] : isGirl ? ['male','boy','m'] : ['female','girl','f'];

    const ageFilter = `AND (dob IS NULL OR (
      TIMESTAMPDIFF(YEAR, dob, CURDATE()) >= 18 AND
      TIMESTAMPDIFF(YEAR, dob, CURDATE()) <= CASE gender
        WHEN 'female' THEN 35 WHEN 'girl' THEN 35 WHEN 'f' THEN 35
        WHEN 'male' THEN 45 WHEN 'boy' THEN 45 WHEN 'm' THEN 45
        ELSE 45 END
    ))`;

    // Try with block filter first; if blocks table missing, fall back without it
    let rows;
    const blockFilter = `AND id NOT IN (
      SELECT blocked_id FROM blocks WHERE blocker_id=?
      UNION SELECT blocker_id FROM blocks WHERE blocked_id=?
    )`;

    const verifiedFilter = isBoy ? 'AND is_verified=1' : '';

    const baseWhere = (withBlock) => {
      const placeholders = variants.map(() => '?').join(',');
      if (withBlock) {
        return {
          sql: `SELECT ${PUBLIC_FIELDS} FROM users
                WHERE id!=? AND gender IN (${placeholders}) AND gender IS NOT NULL AND name IS NOT NULL
                AND is_blocked=0 ${verifiedFilter} ${blockFilter} ${ageFilter}
                ORDER BY is_online DESC, rating DESC, last_seen DESC LIMIT 50`,
          params: [req.user.userId, ...variants, req.user.userId, req.user.userId],
        };
      }
      return {
        sql: `SELECT ${PUBLIC_FIELDS} FROM users
              WHERE id!=? AND gender IN (${placeholders}) AND gender IS NOT NULL AND name IS NOT NULL
              AND is_blocked=0 ${verifiedFilter} ${ageFilter}
              ORDER BY is_online DESC, rating DESC, last_seen DESC LIMIT 50`,
        params: [req.user.userId, ...variants],
      };
    };

    try {
      const q = baseWhere(true);
      [rows] = await pool.query(q.sql, q.params);
    } catch (_) {
      // blocks table may not exist yet — run without it
      const q = baseWhere(false);
      [rows] = await pool.query(q.sql, q.params);
    }

    const io = req.app.get('io');
    const onlineMap = io?.onlineUsers;

    rows = rows.map(u => {
      const activeInSocket = onlineMap ? onlineMap.has(u.id) : (u.is_online === 1);
      const hidden = isHideOnline(u.content_prefs);
      const isOnline = (activeInSocket && !hidden) ? 1 : 0;
      return {
        ...u,
        is_online: isOnline,
        rating: parseFloat(u.rating || 0),
        age: calcAge(u.dob),
      };
    });
    res.set('Cache-Control', 'no-store');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/random', auth, async (req, res) => {
  try {
    const [me] = await pool.query('SELECT gender FROM users WHERE id=?', [req.user.userId]);
    const raw = me[0]?.gender?.toLowerCase();
    const isBoy = ['boy','male','m'].includes(raw);
    const targetGender = isBoy ? ['female','girl','f'] : ['male','boy','m'];
    const verifiedFilter = isBoy ? 'AND is_verified=1' : '';
    const placeholders = targetGender.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users
       WHERE id!=? AND gender IN (${placeholders}) AND is_online=1 AND is_blocked=0 ${verifiedFilter}
       ORDER BY RAND() LIMIT 1`,
      [req.user.userId, ...targetGender]);
    if (!rows.length) return res.status(404).json({ error: 'No one is online' });
    res.json({ ...rows[0], rating: parseFloat(rows[0].rating || 0), age: calcAge(rows[0].dob) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /users/top — top rated girls leaderboard
router.get('/top', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.city, u.language, u.is_online, u.rating, u.rating_count, u.content_prefs,
              (SELECT COUNT(*) FROM calls WHERE receiver_id = u.id AND status = 'ended') AS calls_count
       FROM users u WHERE u.gender='girl' AND u.is_blocked=0 AND u.is_verified=1
       ORDER BY u.rating DESC, u.rating_count DESC, u.is_online DESC LIMIT 20`
    );
    const io = req.app.get('io');
    const onlineMap = io?.onlineUsers;
    res.json(rows.map(r => {
      const activeInSocket = onlineMap ? onlineMap.has(r.id) : (r.is_online === 1);
      const hidden = isHideOnline(r.content_prefs);
      return {
        ...r,
        is_online: (activeInSocket && !hidden) ? 1 : 0,
        rating: parseFloat(r.rating || 0),
        age: calcAge(r.dob),
      };
    }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /users/:id/rate — rate a user after call (1-5 stars) + optional text + tags
router.post('/:id/rate', auth, async (req, res) => {
  const { stars, callId, review, tags } = req.body;
  if (!stars || stars < 1 || stars > 5)
    return res.status(400).json({ error: 'Stars must be 1–5' });
  if (req.params.id === req.user.userId)
    return res.status(400).json({ error: 'Cannot rate yourself' });
  try {
    const tagsJson = tags ? JSON.stringify(tags) : null;
    await pool.query(
      `INSERT INTO user_ratings (id,rater_id,rated_id,call_id,stars,review_text,tags)
       VALUES (?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE stars=VALUES(stars), call_id=VALUES(call_id),
         review_text=VALUES(review_text), tags=VALUES(tags)`,
      [uuidv4(), req.user.userId, req.params.id, callId||null, stars, review||null, tagsJson]);
    // Recompute avg rating
    const [agg] = await pool.query(
      'SELECT AVG(stars) as avg, COUNT(*) as cnt FROM user_ratings WHERE rated_id=?',
      [req.params.id]);
    await pool.query('UPDATE users SET rating=?,rating_count=? WHERE id=?',
      [parseFloat(agg[0].avg).toFixed(2), agg[0].cnt, req.params.id]);
    res.json({ success: true, newRating: parseFloat(agg[0].avg).toFixed(2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/me/offline', auth, async (req, res) => {
  try {
    await pool.query('UPDATE users SET is_online=0, last_seen=NOW() WHERE id=?', [req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/me', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=?', [req.user.userId]);
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/blocked', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.avatar_url, u.city, u.language, u.gender
       FROM blocks b JOIN users u ON b.blocked_id=u.id
       WHERE b.blocker_id=? ORDER BY b.created_at DESC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/block', auth, async (req, res) => {
  try {
    await pool.query('INSERT IGNORE INTO blocks (id,blocker_id,blocked_id) VALUES (?,?,?)',
      [uuidv4(), req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/block', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM blocks WHERE blocker_id=? AND blocked_id=?', [req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    await pool.query('INSERT IGNORE INTO reports (id,reporter_id,reported_id,reason) VALUES (?,?,?,?)',
      [uuidv4(), req.user.userId, req.params.id, reason]);
    // Auto-suspend after 5 unique reports
    const [reps] = await pool.query(
      'SELECT COUNT(DISTINCT reporter_id) as cnt FROM reports WHERE reported_id=?',
      [req.params.id]);
    if (reps[0].cnt >= 5) {
      await pool.query('UPDATE users SET is_blocked=1 WHERE id=?', [req.params.id]);
      console.log(`[MODERATION] User ${req.params.id} auto-suspended after ${reps[0].cnt} reports`);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mute a user (hide their presence, no calls from them)
router.post('/:id/mute', auth, async (req, res) => {
  try {
    await pool.query('INSERT IGNORE INTO mutes (id,muter_id,muted_id) VALUES (?,?,?)',
      [uuidv4(), req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/mute', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM mutes WHERE muter_id=? AND muted_id=?', [req.user.userId, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /users/:id/reviews — fetch reviews about a user (with review_text)
router.get('/:id/reviews', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.stars, r.review_text, r.tags, r.created_at,
              u.name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM user_ratings r
       JOIN users u ON r.rater_id=u.id
       WHERE r.rated_id=? AND r.review_text IS NOT NULL AND r.review_text!=''
       ORDER BY r.created_at DESC LIMIT 20`,
      [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
