const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');

// GET /earnings — girl ke liye total earnings
router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM earnings WHERE girl_id=? ORDER BY created_at DESC LIMIT 50', [req.user.userId]);
    const [[earnSummary]] = await pool.query(
      'SELECT COALESCE(SUM(COALESCE(mins_received, coins_received, 0)),0) AS total_mins, COALESCE(SUM(amount_inr),0) AS total_inr FROM earnings WHERE girl_id=?',
      [req.user.userId]);
    const [[callSummary]] = await pool.query(
      `SELECT COUNT(*) AS total_calls,
              COALESCE(SUM(duration_seconds),0) AS total_secs,
              COALESCE(SUM(girl_coins),0) AS call_coins,
              COALESCE(SUM(girl_earnings_inr),0) AS call_inr
       FROM calls WHERE receiver_id=? AND status="ended" AND free_trial=0`,
      [req.user.userId]);
    const [[withdrawnRows]] = await pool.query(
      'SELECT COALESCE(SUM(amount),0) AS total_withdrawn FROM withdrawals WHERE girl_id=? AND status != "rejected"',
      [req.user.userId]);

    const totalCoins = Math.max(parseFloat(earnSummary?.total_mins) || 0, parseFloat(callSummary?.call_coins) || 0);
    const totalInr  = Math.max(parseFloat(earnSummary?.total_inr) || 0, parseFloat(callSummary?.call_inr) || 0);
    const totalSecs = Number(callSummary?.total_secs) || 0;
    const totalTalkMins = Math.round(totalSecs / 60) || (totalSecs > 0 ? 1 : 0);
    const totalWithdrawn = parseFloat(withdrawnRows?.total_withdrawn) || 0;
    const availableInr = Math.max(0, Math.round((totalInr - totalWithdrawn) * 100) / 100);
    const availableCoins = Math.max(0, Math.round((totalCoins - (totalWithdrawn * 2)) * 10) / 10);

    const [[ratingSummary]] = await pool.query(
      'SELECT COALESCE(AVG(stars), 5.0) AS avg_rating, COUNT(*) AS rating_count FROM user_ratings WHERE rated_id=?',
      [req.user.userId]);

    res.json({
      earnings: rows,
      summary: {
        total_mins: totalCoins,
        total_coins: totalCoins,
        total_inr: totalInr,
        total_talk_mins: totalTalkMins,
        total_talk_secs: totalSecs,
        total_calls: callSummary?.total_calls || 0,
        total_withdrawn_inr: totalWithdrawn,
        available_inr: availableInr,
        available_coins: availableCoins,
        avg_rating: parseFloat(ratingSummary?.avg_rating || 5.0).toFixed(1),
        rating_count: Number(ratingSummary?.rating_count || 0),
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const SAME_DAY_FEE_RATE = 0.10; // 10% fee for same-day withdrawal

// POST /earnings/withdraw — withdrawal request
router.post('/withdraw', auth, async (req, res) => {
  const { amount, upi_id, sameDay } = req.body;
  if (!amount || !upi_id) return res.status(400).json({ error: 'amount and upi_id required' });
  const withdrawAmt = parseFloat(amount);
  if (isNaN(withdrawAmt) || withdrawAmt < 100) return res.status(400).json({ error: 'Minimum withdrawal ₹100' });
  try {
    const [[earnedRows]] = await pool.query(
      'SELECT COALESCE(SUM(amount_inr),0) AS total_earned FROM earnings WHERE girl_id=?',
      [req.user.userId]);
    const [[callRows]] = await pool.query(
      'SELECT COALESCE(SUM(girl_earnings_inr),0) AS total_call_earned FROM calls WHERE receiver_id=? AND status="ended" AND free_trial=0',
      [req.user.userId]);
    const [withdrawnRows] = await pool.query(
      'SELECT COALESCE(SUM(amount),0) AS total_withdrawn FROM withdrawals WHERE girl_id=? AND status != "rejected"',
      [req.user.userId]);

    const totalGross = Math.max(parseFloat(earnedRows?.total_earned) || 0, parseFloat(callRows?.total_call_earned) || 0);
    const available = Math.max(0, totalGross - (parseFloat(withdrawnRows[0]?.total_withdrawn) || 0));
    if (available < withdrawAmt)
      return res.status(400).json({ error: `Insufficient earnings. Available: ₹${available.toFixed(2)}` });

    const feeAmount = sameDay ? Math.round(withdrawAmt * SAME_DAY_FEE_RATE * 100) / 100 : 0;

    await pool.query('INSERT INTO withdrawals (id,girl_id,amount,upi_id,same_day,fee_amount) VALUES (?,?,?,?,?,?)',
      [uuidv4(), req.user.userId, withdrawAmt, upi_id, sameDay ? 1 : 0, feeAmount]);
    res.json({
      success: true,
      available_inr: Math.max(0, available - withdrawAmt),
      message: sameDay
        ? `Same-day withdrawal submitted. ₹${feeAmount.toFixed(2)} fee applied — ₹${(withdrawAmt - feeAmount).toFixed(2)} will be sent today.`
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
