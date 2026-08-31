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
    const [rows] = await pool.query('SELECT spin_available, is_premium FROM users WHERE id=?', [req.user.userId]);
    res.json({ spinAvailable: !!(rows[0]?.spin_available || rows[0]?.is_premium) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT spin_available, is_premium, minutes FROM users WHERE id=?', [req.user.userId]);
    if (!rows[0]?.spin_available && !rows[0]?.is_premium)
      return res.status(400).json({ error: 'Buy a premium pack to unlock your spin!' });

    const prize = pickPrize();
    await pool.query('UPDATE users SET spin_available=0 WHERE id=?', [req.user.userId]);
    await pool.query('INSERT INTO spin_history (id,user_id,reward_type,reward_value) VALUES (?,?,?,?)',
      [uuidv4(), req.user.userId, prize.type, prize.value]);
    const [user] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
    res.json({
      prizeIndex: prize.index,
      prize: { type: prize.type, label: prize.label, emoji: prize.emoji, value: prize.value },
      coins: user[0].minutes,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
