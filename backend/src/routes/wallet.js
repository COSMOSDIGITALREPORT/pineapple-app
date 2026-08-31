const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

router.get('/', auth, async (req, res) => {
  try {
    const [user]  = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
    const [txns]  = await pool.query('SELECT * FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 20', [req.user.userId]);
    const [gifts] = await pool.query(
      'SELECT g.*, u.name AS sender_name, u.avatar_url AS sender_avatar FROM gifts g JOIN users u ON g.sender_id=u.id WHERE g.receiver_id=? ORDER BY g.created_at DESC LIMIT 10',
      [req.user.userId]);
    res.json({ minutes: user[0]?.minutes || 0, transactions: txns, gifts });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/gift', auth, async (req, res) => {
  const { receiverId, giftType, coinsCost } = req.body;
  if (!receiverId || !giftType || !coinsCost) return res.status(400).json({ error: 'Missing fields' });
  try {
    const [sender] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
    if (sender[0].minutes < coinsCost) return res.status(400).json({ error: 'Insufficient coins' });
    await pool.query('UPDATE users SET minutes=minutes-? WHERE id=?', [coinsCost, req.user.userId]);
    await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [coinsCost, receiverId]);
    await pool.query('INSERT INTO gifts (id,sender_id,receiver_id,gift_type,coins_spent) VALUES (?,?,?,?,?)',
      [uuidv4(), req.user.userId, receiverId, giftType, coinsCost]);
    await pool.query('INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
      [uuidv4(), req.user.userId, 'spend', coinsCost, `Sent ${giftType} gift`]);

    // Girl ki earnings table mein bhi add karo (1 coin = ₹0.5)
    const inrAmount = (coinsCost * 0.5).toFixed(2);
    await pool.query(
      'INSERT INTO earnings (id,girl_id,call_id,mins_received,amount_inr) VALUES (?,?,?,?,?)',
      [uuidv4(), receiverId, null, coinsCost, inrAmount]);
    await pool.query(
      'INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
      [uuidv4(), receiverId, 'earn', coinsCost, `${giftType} gift received`]);

    // Socket event: notify receiver in real-time
    try {
      const io = req.app.get('io');
      const receiverSocketId = io?.onlineUsers?.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('gift:received', {
          senderId: req.user.userId,
          giftType,
          coinsCost,
          ts: Date.now(),
        });
      }
    } catch (e) { console.warn('[GIFT] socket emit failed:', e.message); }

    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /wallet/redeem-gift  — spin gift ko minutes mein convert karo (₹1 = 1 min)
router.post('/redeem-gift', auth, async (req, res) => {
  const { giftValue, giftLabel } = req.body;
  if (!giftValue || giftValue <= 0) return res.status(400).json({ error: 'Invalid gift value' });
  try {
    const mins = Math.floor(giftValue); // ₹1 = 1 min
    await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [mins, req.user.userId]);
    await pool.query('INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
      [uuidv4(), req.user.userId, 'earn', mins, `Redeemed ${giftLabel || 'gift'} → ${mins} mins`]);
    const [rows] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
    res.json({ success: true, minsAdded: mins, totalCoins: rows[0].minutes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
