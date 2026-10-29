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
    socket.on('call:ended',     async ({ otherUserId, duration, formattedDuration, callType, callId }) => {
      const d = online.get(otherUserId);
      if (d) io.to(d).emit('call:ended', { duration, formattedDuration, callType, callId });
      // If duration is 0 or empty, caller cancelled before answer: send FCM cancellation push to receiver!
      if (!duration || duration === 0 || duration === '00:00') {
        try {
          await sendPushToUser(otherUserId, {
            title: 'Call Ended',
            body: 'Call was cancelled',
            data: {
              type: 'call_cancelled',
              callId: String(callId || ''),
            },
          });
        } catch (_) {}
      }
    });

    socket.on('call:cancel',    async ({ otherUserId, callId }) => {
      const d = online.get(otherUserId);
      if (d) io.to(d).emit('call:ended', { duration: 0, formattedDuration: '00:00', callId, cancelled: true });
      try {
        await sendPushToUser(otherUserId, {
          title: 'Call Cancelled',
          body: 'Call was cancelled',
          data: {
            type: 'call_cancelled',
            callId: String(callId || ''),
          },
        });
      } catch (_) {}
    });

    socket.on('room:join',    ({ roomId }) => { socket.join(`room:${roomId}`);  socket.to(`room:${roomId}`).emit('room:user_joined', { userId }); });
    socket.on('room:leave',   ({ roomId }) => { socket.leave(`room:${roomId}`); socket.to(`room:${roomId}`).emit('room:user_left',  { userId }); });
    socket.on('user:online', async (payload) => {
      if (socket.userId) {
        online.set(socket.userId, socket.id);
        try {
          const [rows] = await pool.query('SELECT gender, is_live FROM users WHERE id=?', [socket.userId]);
          const u = rows && rows[0];
          const isGirl = u && ['girl', 'female', 'f'].includes((u.gender || '').toLowerCase());
          if (isGirl) {
            let isLive = (u.is_live === 1 || u.is_live === true || u.is_live === '1') ? 1 : 0;
            if (payload && payload.isLive !== undefined) {
              isLive = (payload.isLive === true || payload.isLive === 1 || payload.isLive === '1') ? 1 : 0;
            }
            await pool.query('UPDATE users SET is_online=?, is_live=? WHERE id=?', [isLive, isLive, socket.userId]);
            io.emit('user:status_changed', { userId: socket.userId, is_online: isLive, is_live: isLive });
            console.log(`[SOCKET] 🟢 user:online (girl host ${socket.userId}): is_live=${isLive}`);
            return;
          }
        } catch (_) {}
        pool.query('UPDATE users SET is_online=1 WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 1, is_live: 1 });
        console.log(`[SOCKET] 🟢 user:online: ${socket.userId}`);
      }
    });

    socket.on('user:offline', async () => {
      if (socket.userId) {
        online.delete(socket.userId);
        pool.query('UPDATE users SET is_online=0, is_live=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 0, is_live: 0 });
        console.log(`[SOCKET] ⚫ user:offline: ${socket.userId}`);
      }
    });

    socket.on('disconnect', async () => {
      if (socket.userId) {
        online.delete(socket.userId);
        try {
          const [rows] = await pool.query('SELECT gender, is_live FROM users WHERE id=?', [socket.userId]);
          const u = rows && rows[0];
          const isGirl = u && ['girl', 'female', 'f'].includes((u.gender || '').toLowerCase());
          if (isGirl && (u.is_live === 1 || u.is_live === true || u.is_live === '1')) {
            // Girl host has live toggle ON — she remains LIVE and ONLINE even when socket disconnects / app in background!
            console.log(`[SOCKET] 🟡 disconnect: girl host ${socket.userId} is_live=1, keeping online in boys app`);
            return;
          }
        } catch (_) {}
        pool.query('UPDATE users SET is_online=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
        io.emit('user:status_changed', { userId: socket.userId, is_online: 0, is_live: 0 });
      }
    });
  });
};
