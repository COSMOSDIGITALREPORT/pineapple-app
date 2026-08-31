const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const auth   = require('../middleware/auth');
const pool   = require('../config/db');
const { generateAgoraToken } = require('../config/agora');

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT r.*, u.name AS host_name, u.avatar_url AS host_avatar FROM rooms r JOIN users u ON r.host_id=u.id WHERE r.is_live=1 ORDER BY r.listener_count DESC LIMIT 20');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', auth, async (req, res) => {
  const { name, topic, language } = req.body;
  const roomId = uuidv4(), channel = uuidv4();
  try {
    await pool.query('INSERT INTO rooms (id,name,topic,host_id,language,agora_channel) VALUES (?,?,?,?,?,?)',
      [roomId, name, topic, req.user.userId, language, channel]);
    const token = generateAgoraToken(channel, 1);
    res.json({ roomId, channel, token, appId: process.env.AGORA_APP_ID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const [rooms] = await pool.query('SELECT * FROM rooms WHERE id=?', [req.params.id]);
    if (!rooms.length) return res.status(404).json({ error: 'Room not found' });
    await pool.query('INSERT IGNORE INTO room_members (id,room_id,user_id) VALUES (?,?,?)',
      [uuidv4(), req.params.id, req.user.userId]);
    await pool.query('UPDATE rooms SET listener_count=listener_count+1 WHERE id=?', [req.params.id]);
    const token = generateAgoraToken(rooms[0].agora_channel, 2);
    res.json({ token, channelName: rooms[0].agora_channel, appId: process.env.AGORA_APP_ID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('UPDATE rooms SET is_live=0 WHERE id=? AND host_id=?', [req.params.id, req.user.userId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
