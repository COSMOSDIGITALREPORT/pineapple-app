const pool = require('../config/db');
const { sendPush } = require('../config/fcm');

module.exports = (io) => {
  const online = new Map(); // userId -> socketId
  io.onlineUsers = online; // make accessible to routes

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;
    if (userId) {
      // disconnect old socket if same user reconnects
      const oldSocketId = online.get(userId);
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        oldSocket?.disconnect(true);
      }
      online.set(userId, socket.id);
      socket.userId = userId;
      pool.query('UPDATE users SET is_online=1 WHERE id=?', [userId]).catch(() => {});
      io.emit('user:status_changed', { userId, is_online: 1 });
      console.log(`[SOCKET] ✅ Connected: ${userId} (online: ${online.size})`);
    }

    socket.on('call:ring', async ({ receiverId, callId, callerName, callerAvatar, channelName, type }) => {
      console.log(`[CALL] ring from ${userId} → ${receiverId}`);
      console.log(`[CALL] online users:`, [...online.keys()]);

      // Check if blocked
      try {
        const [blocked] = await pool.query(
          'SELECT 1 FROM blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',
          [userId, receiverId, receiverId, userId]
        );
        if (blocked && blocked.length > 0) {
          console.log(`[CALL] 🚫 Blocked: ${userId} <-> ${receiverId}`);
          socket.emit('call:unavailable', { receiverId, error: 'Blocked user' });
          return;
        }
      } catch (_) {}

      // Check if receiver host has explicitly toggled offline (is_live = 0)
      try {
        const [userRows] = await pool.query('SELECT is_live, fcm_token FROM users WHERE id=?', [receiverId]);
        const receiverUser = userRows[0];
        if (receiverUser && (receiverUser.is_live === 0 || receiverUser.is_live === false)) {
          console.log(`[CALL] 🚫 Host ${receiverId} is offline (is_live = 0)`);
          socket.emit('call:unavailable', { receiverId, error: 'Host is currently offline' });
          return;
        }
      } catch (_) {}

      const dest = online.get(receiverId);
      console.log(`[CALL] dest socket: ${dest}`);
      if (dest) {
        io.to(dest).emit('call:incoming', { callId, callerName, callerAvatar, channelName, type, callerId: userId });
        console.log(`[CALL] ✅ call:incoming sent to ${receiverId}`);
      } else {
        // Receiver app process is closed/swiped, but host is Live:
        // Send high-priority FCM call push so receiver gets incoming call alert!
        try {
          const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id=?', [receiverId]);
          if (rows[0]?.fcm_token) {
            await sendPush(rows[0].fcm_token, {
              title: `📞 ${callerName} is calling`,
              body: `Incoming ${type} call`,
              data: {
                type: 'incoming_call',
                callId: String(callId || ''),
                callerId: String(userId || ''),
                callerName: String(callerName || ''),
                callerAvatar: String(callerAvatar || ''),
                channelName: String(channelName || ''),
                callType: String(type || 'video'),
              },
            });
            console.log(`[CALL] 📲 FCM incoming call push dispatched to ${receiverId}`);
          }
        } catch (e) { console.error('[FCM] push failed:', e.message); }

        // Keep caller ringing for up to 35 seconds to allow host to open push and answer
        const ringTimer = setTimeout(() => {
          if (!online.get(receiverId)) {
            console.log(`[CALL] ⏱️ Call ${callId} timed out (no answer)`);
            socket.emit('call:unavailable', { receiverId, error: 'No answer' });
          }
        }, 35000);

        socket.once('call:ended', () => clearTimeout(ringTimer));
        socket.once('disconnect', () => clearTimeout(ringTimer));
      }
    });

    socket.on('call:accepted',  ({ callerId })              => { const d = online.get(callerId);  if (d) io.to(d).emit('call:accepted',  {}); });
    socket.on('call:ended',     ({ otherUserId, duration, formattedDuration, callType }) => { const d = online.get(otherUserId); if (d) io.to(d).emit('call:ended', { duration, formattedDuration, callType }); });

    socket.on('room:join',    ({ roomId }) => { socket.join(`room:${roomId}`);  socket.to(`room:${roomId}`).emit('room:user_joined', { userId }); });
    socket.on('room:leave',   ({ roomId }) => { socket.leave(`room:${roomId}`); socket.to(`room:${roomId}`).emit('room:user_left',  { userId }); });
    socket.on('user:online', () => {
      if (socket.userId) {
        online.set(socket.userId, socket.id);
        pool.query('UPDATE users SET is_online=1, is_live=1 WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 1, is_live: 1 });
        console.log(`[SOCKET] 🟢 user:online: ${socket.userId}`);
      }
    });

    socket.on('user:offline', () => {
      if (socket.userId) {
        online.delete(socket.userId);
        pool.query('UPDATE users SET is_online=0, is_live=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 0, is_live: 0 });
        console.log(`[SOCKET] ⚫ user:offline: ${socket.userId}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        online.delete(socket.userId);
        pool.query('UPDATE users SET is_online=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 0, is_live: 0 });
      }
    });
  });
};
