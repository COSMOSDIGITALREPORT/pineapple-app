const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');
const { generateAgoraToken } = require('../config/agora');
const { sendPush } = require('../config/fcm');

const MINS_PER_MIN_AUDIO = 1;   // 1 minute deducted per minute of audio call
const MINS_PER_MIN_VIDEO = 2;   // 2 minutes deducted per minute of video call
const GIRL_RATIO         = 0.5; // girl gets 50% of caller's minutes as earnings

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
      // Check caller has enough minutes
      const [caller] = await pool.query('SELECT minutes FROM users WHERE id=?', [req.user.userId]);
      if (!caller.length || caller[0].minutes < 1)
        return res.status(400).json({ error: 'Not enough minutes. Please recharge.' });

      await pool.query(
        'INSERT INTO calls (id,caller_id,receiver_id,call_type,status,agora_channel,started_at) VALUES (?,?,?,?,"initiated",?,NOW())',
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
  const { duration } = req.body; // seconds
  try {
    const [rows] = await pool.query('SELECT * FROM calls WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Call not found' });
    const call = rows[0];
    if (call.status === 'ended') return res.json({ success: true, already_ended: true });

    const rate        = call.call_type === 'video' ? MINS_PER_MIN_VIDEO : MINS_PER_MIN_AUDIO;
    const minsUsed    = Math.ceil((duration / 60) * rate);
    const girlMins    = Math.floor(minsUsed * GIRL_RATIO);

    await pool.query(
      'UPDATE calls SET status="ended",ended_at=NOW(),duration_seconds=?,mins_deducted=? WHERE id=?',
      [duration, minsUsed, req.params.id]);

    // Free trial calls: don't deduct from caller
    if (!call.free_trial) {
      await pool.query('UPDATE users SET minutes=GREATEST(0,minutes-?) WHERE id=?', [minsUsed, call.caller_id]);
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?,?)',
        [uuidv4(), call.caller_id, 'spend', minsUsed, `${call.call_type} call`, req.params.id]);
    }

    // Add minutes to girl's earnings
    if (girlMins > 0) {
      await pool.query(
        'INSERT INTO earnings (id,girl_id,call_id,mins_received,amount_inr) VALUES (?,?,?,?,?)',
        [uuidv4(), call.receiver_id, req.params.id, girlMins, (girlMins * 0.5).toFixed(2)]);
      await pool.query(
        'INSERT INTO wallet_transactions (id,user_id,type,amount,description,ref_id) VALUES (?,?,?,?,?,?)',
        [uuidv4(), call.receiver_id, 'earn', girlMins, `${call.call_type} call earnings`, req.params.id]);
    }

    res.json({ success: true, minsUsed, girlMins, duration });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u1.name AS caller_name, u1.avatar_url AS caller_avatar,
              u2.name AS receiver_name, u2.avatar_url AS receiver_avatar
       FROM calls c
       JOIN users u1 ON c.caller_id=u1.id
       JOIN users u2 ON c.receiver_id=u2.id
       WHERE (c.caller_id=? OR c.receiver_id=?) AND c.status='ended' AND c.duration_seconds > 0
       ORDER BY c.created_at DESC LIMIT 30`,
      [req.user.userId, req.user.userId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
