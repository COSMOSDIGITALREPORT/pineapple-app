const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

// index matches frontend PRIZES array exactly
const PRIZES = [
  { index:0, type:'rose',      label:'Rose',      emoji:'🌹', value:10,    weight:370 },
  { index:1, type:'chocolate', label:'Chocolate', emoji:'🍫', value:20,    weight:270 },
  { index:2, type:'miss',      label:'Luck!',     emoji:'🍀', value:0,     weight:100 },
  { index:3, type:'pastry',    label:'Pastry',    emoji:'🍰', value:50,    weight:100 },
  { index:4, type:'pineapple', label:'Pineapple', emoji:'🍍', value:100,   weight:40  },
  { index:5, type:'miss',      label:'Luck!',     emoji:'🍀', value:0,     weight:100 },
  { index:6, type:'heart',     label:'Heart',     emoji:'❤️', value:200,   weight:12  },
  { index:7, type:'perfume',   label:'Perfume',   emoji:'🌸', value:500,   weight:5   },
  { index:8, type:'crown',     label:'Crown',     emoji:'👑', value:5000,  weight:2   },
  { index:9, type:'diamond',   label:'Diamond',   emoji:'💎', value:10000, weight:1   },
];

function pickPrize() {
  const total = PRIZES.reduce((s,r) => s+r.weight, 0);
  let rand = Math.random() * total;
  for (const r of PRIZES) { rand -= r.weight; if (rand <= 0) return r; }
  return PRIZES[0];
}

router.get('/status', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT spin_available, is_premium, minutes FROM users WHERE id=?', [req.user.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPremiumMember = !!(user.is_premium || user.spin_available);
    const hasCoins = (user.minutes || 0) > 0;

    // Check if user already spun today in Indian Standard Time (UTC+5:30)
    const [todaySpin] = await pool.query(
      `SELECT id, spun_at FROM spin_history 
       WHERE user_id = ? 
         AND DATE(CONVERT_TZ(spun_at, '+00:00', '+05:30')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30'))
       LIMIT 1`,
      [req.user.userId]
    );
    const alreadySpunToday = todaySpin.length > 0;

    let reason = '';
    let message = '';
    let spinAvailable = false;

    if (!isPremiumMember) {
      reason = 'not_premium';
      message = 'Buy Premium (₹500) to unlock daily Fortune Wheel spin!';
    } else if (!hasCoins) {
      reason = 'no_coins';
      message = 'Your membership coins are finished (0 coins). Buy coins to unlock daily spin!';
    } else if (alreadySpunToday) {
      reason = 'already_spun_today';
      message = 'Daily spin used! Come back tomorrow for your next spin.';
    } else {
      spinAvailable = true;
      message = 'Daily spin available!';
    }

    res.json({
      spinAvailable,
      isPremium: isPremiumMember,
      coins: user.minutes || 0,
      alreadySpunToday,
      reason,
      message,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT spin_available, is_premium, minutes FROM users WHERE id=?', [req.user.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isPremiumMember = !!(user.is_premium || user.spin_available);
    const hasCoins = (user.minutes || 0) > 0;

    if (!isPremiumMember) {
      return res.status(400).json({ error: 'Buy Premium (₹500) to unlock daily Fortune Wheel spin!' });
    }
    if (!hasCoins) {
      return res.status(400).json({ error: 'Your membership coins have finished. Buy coins to spin!' });
    }

    // Check once per day (IST)
    const [todaySpin] = await pool.query(
      `SELECT id, spun_at FROM spin_history 
       WHERE user_id = ? 
         AND DATE(CONVERT_TZ(spun_at, '+00:00', '+05:30')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+05:30'))
       LIMIT 1`,
      [req.user.userId]
    );
    if (todaySpin.length > 0) {
      return res.status(400).json({ error: 'You have already used your spin for today. Come back tomorrow!' });
    }

    const prize = pickPrize();
    await pool.query('INSERT INTO spin_history (id,user_id,reward_type,reward_value) VALUES (?,?,?,?)',
      [uuidv4(), req.user.userId, prize.type, prize.value]);

    if (prize.value > 0) {
      await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [prize.value, req.user.userId]);
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
        [uuidv4(), req.user.userId, 'spin_gift', prize.value, `Won ${prize.emoji} ${prize.label} (Worth ₹${prize.value}) on Spin`]
      );
    }
    const [updatedUser] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
    res.json({
      prizeIndex: prize.index,
      prize: { type: prize.type, label: prize.label, emoji: prize.emoji, value: prize.value },
      coins: updatedUser[0]?.minutes ?? user.minutes,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
