const router   = require('express').Router();
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { v4: uuidv4 } = require('uuid');
const auth     = require('../middleware/auth');
const pool     = require('../config/db');

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
}

const PACKAGES = {
  pack_9:   { coins: 15,  price: 9,   label: 'Intro Trial', isIntro: true },
  pack_100: { coins: 120, price: 100, label: 'Basic' },
  pack_200: { coins: 240, price: 200, label: 'Standard' },
  pack_500: { coins: 700, price: 500, label: 'Premium', unlocksSpin: true },
};

router.post('/create-order', auth, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }
    const pkg = PACKAGES[req.body.packageId];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    if (req.body.packageId === 'pack_9') {
      const [userRows] = await pool.query('SELECT intro_9_used FROM users WHERE id=?', [req.user.userId]);
      if (userRows[0]?.intro_9_used) {
        return res.status(400).json({ error: 'The ₹9 Intro Trial plan is a one-time offer for new users only.' });
      }
    }

    const order = await razorpay.orders.create({
      amount: pkg.price * 100, currency: 'INR',
      receipt: `r_${req.user.userId.replace(/-/g, '').substring(0, 20)}_${Date.now().toString().slice(-8)}`,
      notes: { userId: req.user.userId, packageId: req.body.packageId },
    });
    const baseUrl = process.env.BASE_URL || 'https://sleeve-crewman-municipal.ngrok-free.dev';
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.RAZORPAY_KEY_ID, logoUrl: `${baseUrl}/logo.png`, ...pkg });
  } catch (err) { console.error('[RAZORPAY ERROR]', err.message || err); res.status(500).json({ error: 'Failed to create order', detail: err.message }); }
});

router.post('/verify', auth, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({ error: 'Razorpay not configured' });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId } = req.body;
    const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (sig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });

    const pkg = PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    const isPremiumPack = req.body.packageId === 'pack_500';
    const isIntroPack   = req.body.packageId === 'pack_9';
    if (isPremiumPack) {
      await pool.query('UPDATE users SET minutes=minutes+?, is_premium=1, plan_id=?, spin_available=1 WHERE id=?', [pkg.coins, req.body.packageId, req.user.userId]);
    } else if (isIntroPack) {
      await pool.query('UPDATE users SET minutes=minutes+?, intro_9_used=1 WHERE id=?', [pkg.coins, req.user.userId]);
    } else {
      await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [pkg.coins, req.user.userId]);
    }
    await pool.query('INSERT INTO wallet_transactions (id,user_id,type,amount,description) VALUES (?,?,?,?,?)',
      [uuidv4(), req.user.userId, 'purchase', pkg.coins, `Bought ${pkg.coins} coins for ₹${pkg.price}`]);

    const [rows] = await pool.query('SELECT minutes, is_premium, plan_id, intro_9_used FROM users WHERE id=?', [req.user.userId]);
    res.json({
      success: true,
      coins: rows[0].minutes,
      minsAdded: pkg.coins,
      isPremium: !!rows[0].is_premium,
      planId: rows[0].plan_id,
      intro_9_used: !!rows[0].intro_9_used,
      intro9Used: !!rows[0].intro_9_used,
      spinReset: isPremiumPack
    });
  } catch (err) { res.status(500).json({ error: 'Verification failed' }); }
});

module.exports = router;
