const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

// GET /earnings — girl ke liye total earnings
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM earnings WHERE girl_id=? ORDER BY created_at DESC LIMIT 50', [req.user.userId]);
    const [summary] = await pool.query(
      'SELECT COALESCE(SUM(mins_received),0) AS total_mins, COALESCE(SUM(amount_inr),0) AS total_inr FROM earnings WHERE girl_id=?',
      [req.user.userId]);
    res.json({ earnings: rows, summary: summary[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const SAME_DAY_FEE_RATE = 0.10; // 10% fee for same-day withdrawal

// POST /earnings/withdraw — withdrawal request
router.post('/withdraw', auth, async (req, res) => {
  const { amount, upi_id, sameDay } = req.body;
  if (!amount || !upi_id) return res.status(400).json({ error: 'amount and upi_id required' });
  if (amount < 100) return res.status(400).json({ error: 'Minimum withdrawal ₹100' });
  try {
    const [summary] = await pool.query(
      'SELECT COALESCE(SUM(amount_inr),0) AS available FROM earnings WHERE girl_id=? AND status="pending"',
      [req.user.userId]);
    if (parseFloat(summary[0].available) < parseFloat(amount))
      return res.status(400).json({ error: 'Insufficient earnings' });

    const feeAmount = sameDay ? Math.round(amount * SAME_DAY_FEE_RATE * 100) / 100 : 0;

    await pool.query('INSERT INTO withdrawals (id,girl_id,amount,upi_id,same_day,fee_amount) VALUES (?,?,?,?,?,?)',
      [uuidv4(), req.user.userId, amount, upi_id, sameDay ? 1 : 0, feeAmount]);
    res.json({
      success: true,
      message: sameDay
        ? `Same-day withdrawal submitted. ₹${feeAmount.toFixed(2)} fee applied — ₹${(amount - feeAmount).toFixed(2)} will be sent today.`
        : 'Withdrawal request submitted. Processing in 3-5 days.',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /earnings/withdrawals — withdrawal history
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM withdrawals WHERE girl_id=? ORDER BY created_at DESC', [req.user.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
