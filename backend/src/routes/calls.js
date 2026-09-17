const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');
const { generateAgoraToken } = require('../config/agora');
const { sendPush } = require('../config/fcm');

const MINS_PER_MIN_AUDIO = 1;   // 1 coin deducted per minute of audio call
const MINS_PER_MIN_VIDEO = 2;   // 2 coins deducted per minute of video call
const GIRL_RATIO         = 0.70; // girl gets 70% of caller's spent coins
const PLATFORM_RATIO     = 0.30; // platform keeps 30% of caller's spent coins
const COIN_TO_INR_RATE   = 0.50; // 1 coin = ₹0.50 (0.7 coins = ₹0.35, 1.4 coins = ₹0.70)

router.post('/initiate', auth, async (req, res) => {
  const { receiverId, type = 'audio', freeTrialCall } = req.body;
  const callId = uuidv4(), channelName = uuidv4();
  try {
    if (freeTrialCall) {
      const [userRows] = await pool.query('SELECT free_trial_used FROM users WHERE id=?', [req.user.userId]);
      if (userRows[0]?.free_trial_used) return res.status(400).json({ error: 'Free trial already used.' });
      await pool.query('UPDATE users SET free_trial_used=1 WHERE id=?', [req.user.userId]);
      await pool.query(
        'INSERT INTO calls (id,caller_id,receiver_id,call_type,status,agora_channel,started_at,free_trial) VALUES (?,?,?,?,"initiated",?,NOW(),1)',
        [callId, req.user.userId, receiverId, type, channelName]);
    } else {
      const rate = type === 'video' ? MINS_PER_MIN_VIDEO : MINS_PER_MIN_AUDIO;
      // Check caller has enough coins for at least 1 minute
      const [caller] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
      if (!caller.length || caller[0].minutes < rate)
        return res.status(400).json({ error: 'Not enough coins. Please recharge.' });

      await pool.query(
        'INSERT INTO calls (id,caller_id,receiver_id,call_type,status,agora_channel,started_at,free_trial) VALUES (?,?,?,?,"initiated",?,NOW(),0)',
        [callId, req.user.userId, receiverId, type, channelName]);
    }

    const callerToken   = generateAgoraToken(channelName, 1);
    const receiverToken = generateAgoraToken(channelName, 2);
    res.json({ callId, callerToken, receiverToken, channelName, appId: process.env.AGORA_APP_ID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/receiver-token', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM calls WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Call not found' });
    const token = generateAgoraToken(rows[0].agora_channel, 2);
    res.json({ receiverToken: token, channelName: rows[0].agora_channel, appId: process.env.AGORA_APP_ID, callId: req.params.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/end', auth, async (req, res) => {
  const { duration = 0 } = req.body; // seconds
  try {
    const [rows] = await pool.query('SELECT * FROM calls WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Call not found' });
    const call = rows[0];
    if (call.status === 'ended') return res.json({ success: true, already_ended: true });

    const isFreeTrial = !!call.free_trial;
    const rate        = call.call_type === 'video' ? MINS_PER_MIN_VIDEO : MINS_PER_MIN_AUDIO;
    const durationSec = Math.max(0, parseInt(duration) || 0);

    let coinsUsed = 0;
    let girlCoins = 0;
    let girlInr = 0;
    let platformInr = 0;

    if (!isFreeTrial && durationSec > 0) {
      const billableMins = Math.max(1, Math.ceil(durationSec / 60));
      coinsUsed   = billableMins * rate;
      girlCoins   = parseFloat((coinsUsed * GIRL_RATIO).toFixed(2));
      girlInr     = parseFloat((girlCoins * COIN_TO_INR_RATE).toFixed(2));
      platformInr = parseFloat(((coinsUsed * PLATFORM_RATIO) * COIN_TO_INR_RATE).toFixed(2));
    }

    await pool.query(
      `UPDATE calls SET status="ended", ended_at=NOW(), duration_seconds=?, mins_deducted=?,
        girl_earnings_inr=?, platform_revenue_inr=?, girl_coins=? WHERE id=?`,
      [durationSec, coinsUsed, girlInr, platformInr, girlCoins, req.params.id]
    );

    // Free trial calls: don't deduct from caller, girl gets 0 (platform absorbs)
    if (!isFreeTrial && coinsUsed > 0) {
      await pool.query('UPDATE users SET minutes=GREATEST(0,minutes-?) WHERE id=?', [coinsUsed, call.caller_id]);
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?,?)',
        [uuidv4(), call.caller_id, 'spend', coinsUsed, `${call.call_type} call (${billableMins}m)`, req.params.id]
      );

      // Add 70% earnings to girl's account & credit girl balance
      if (girlCoins > 0) {
        try {
          await pool.query(
            'INSERT INTO earnings (id,girl_id,call_id,mins_received,coins_received,amount_inr) VALUES (?,?,?,?,?,?)',
            [uuidv4(), call.receiver_id, req.params.id, girlCoins, girlCoins, girlInr]
          );
        } catch (e) {
          console.error('Earnings insert error:', e.message);
          try {
            await pool.query(
              'INSERT INTO earnings (id,girl_id,call_id,coins_received,amount_inr) VALUES (?,?,?,?,?)',
              [uuidv4(), call.receiver_id, req.params.id, girlCoins, girlInr]
            );
          } catch (_) {}
        }
        await pool.query('UPDATE users SET minutes=minutes+? WHERE id=?', [girlCoins, call.receiver_id]);
        await pool.query(
          'INSERT INTO wallet_transactions (id,user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?,?)',
          [uuidv4(), call.receiver_id, 'earn', girlCoins, `${call.call_type} call earnings (₹${girlInr})`, req.params.id]
        );
      }
    }

    const fmt = `${String(Math.floor(durationSec / 60)).padStart(2, '0')}:${String(durationSec % 60).padStart(2, '0')}`;
    res.json({ success: true, coinsUsed, girlCoins, girlInr, platformInr, duration: durationSec, formattedDuration: fmt, isFreeTrial });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, 
              u1.name AS caller_name, u1.avatar_url AS caller_avatar,
              u2.name AS receiver_name, u2.avatar_url AS receiver_avatar,
              CASE WHEN c.caller_id = ? THEN u2.id ELSE u1.id END AS other_user_id,
              CASE WHEN c.caller_id = ? THEN u2.name ELSE u1.name END AS other_user_name,
              CASE WHEN c.caller_id = ? THEN u2.avatar_url ELSE u1.avatar_url END AS other_user_avatar
       FROM calls c
       JOIN users u1 ON c.caller_id=u1.id
       JOIN users u2 ON c.receiver_id=u2.id
       WHERE (c.caller_id=? OR c.receiver_id=?) AND c.status='ended'
       ORDER BY c.created_at DESC LIMIT 30`,
      [req.user.userId, req.user.userId, req.user.userId, req.user.userId, req.user.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
