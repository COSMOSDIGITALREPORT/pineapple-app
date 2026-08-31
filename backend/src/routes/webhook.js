const router = require('express').Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const pool   = require('../config/db');

const MINS_MAP = { pack_100: 120, pack_200: 240, pack_500: 700 };
const PRICE_MAP = { pack_100: 100, pack_200: 200, pack_500: 500 };

// POST /webhook/razorpay  (raw body needed for signature)
router.post('/razorpay', async (req, res) => {
  try {
    const sig      = req.headers['x-razorpay-signature'];
    const body     = JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET)
                           .update(body).digest('hex');
    if (sig !== expected) return res.status(400).json({ error: 'Invalid signature' });

    const event = req.body;
    if (event.event === 'payment.captured') {
      const notes     = event.payload.payment.entity.notes;
      const userId    = notes?.userId;
      const packageId = notes?.packageId;
      const mins = MINS_MAP[packageId];
      const price     = PRICE_MAP[packageId];
      if (!userId || !mins) return res.status(400).json({ error: 'Bad notes' });

      await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [coins, userId]);
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
        [uuidv4(), userId, 'purchase', mins, `Bought ${mins} mins via Razorpay (₹${price})`]);
    }
    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
