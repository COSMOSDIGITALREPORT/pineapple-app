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
  { index:7, type:'perfume',   label:'Perfume',   emoji:'🧴', value:500,   weight:5   },
  { index:8, type:'crown',     label:'Crown',     emoji:'👑', value:5000,  weight:2   },
  { index:9, type:'diamond',   label:'Diamond',   emoji:'💎', value:10000, weight:1   },
];

function pickPrize() {
  const total = PRIZES.reduce((s,r) => s+r.weight, 0);
  let rand = Math.random() * total;
  for (const r of PRIZES) { rand -= r.weight; if (rand <= 0) return r; }
  return PRIZES[0];
}

// GET /spin/status — Check if user has an unlocked spin from a premium plan
router.get('/status', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT spin_available, is_premium, minutes FROM users WHERE id=?', [req.user.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const hasSpinCredit = user.spin_available === 1;
    const hasCoins = (user.minutes || 0) > 0;
    const isPremiumMember = !!(user.is_premium || hasSpinCredit);

    let reason = '';
    let message = '';
    let spinAvailable = false;

    if (!isPremiumMember) {
      reason = 'not_premium';
      message = 'Recharge a Premium Plan to unlock Fortune Wheel!';
    } else if (!hasCoins) {
      reason = 'no_coins';
      message = 'Your membership coins are 0. Recharge a Premium Plan to unlock Fortune Wheel!';
    } else if (!hasSpinCredit) {
      reason = 'plan_spin_used';
      message = 'Fortune Wheel spin used for this plan. Recharge a Premium Plan to unlock another spin!';
    } else {
      spinAvailable = true;
      message = 'Fortune Wheel spin available!';
    }

    res.json({
      spinAvailable,
      isPremium: isPremiumMember,
      hasSpinCredit,
      coins: user.minutes || 0,
      reason,
      message,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /spin — Execute Fortune Wheel spin (Only 1 spin per premium plan recharge)
router.post('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT spin_available, is_premium, minutes FROM users WHERE id=?', [req.user.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.spin_available !== 1) {
      return res.status(400).json({ error: 'Recharge a Premium Plan to unlock Fortune Wheel!' });
    }
    if ((user.minutes || 0) <= 0) {
      return res.status(400).json({ error: 'Recharge coins to spin Fortune Wheel!' });
    }

    const prize = pickPrize();
    await pool.query('INSERT INTO spin_history (id,user_id,reward_type,reward_value) VALUES (?,?,?,?)',
      [uuidv4(), req.user.userId, prize.type, prize.value]);

    // Consume the spin credit and add prize coins (if any)
    const prizeCoins = prize.value || 0;
    await pool.query(
      'UPDATE users SET spin_available=0, minutes=minutes+? WHERE id=?',
      [prizeCoins, req.user.userId]
    );

    if (prizeCoins > 0) {
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
        [uuidv4(), req.user.userId, 'spin_gift', prizeCoins, `Won ${prize.emoji} ${prize.label} (Worth ₹${prizeCoins}) on Fortune Wheel`]
      );
    }

    const [updatedUser] = await pool.query('SELECT minutes, spin_available FROM users WHERE id=?', [req.user.userId]);
    res.json({
      prizeIndex: prize.index,
      prize: { type: prize.type, label: prize.label, emoji: prize.emoji, value: prize.value },
      coins: updatedUser[0]?.minutes ?? user.minutes,
      spinAvailable: false,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
