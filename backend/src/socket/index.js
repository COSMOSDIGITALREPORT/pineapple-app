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
      console.log(`[SOCKET] ✅ Connected: ${userId} (online: ${online.size})`);
    }

    socket.on('call:ring', async ({ receiverId, callId, callerName, callerAvatar, channelName, type }) => {
      console.log(`[CALL] ring from ${userId} → ${receiverId}`);
      console.log(`[CALL] online users:`, [...online.keys()]);
      const dest = online.get(receiverId);
      console.log(`[CALL] dest socket: ${dest}`);
      if (dest) {
        io.to(dest).emit('call:incoming', { callId, callerName, callerAvatar, channelName, type, callerId: userId });
        console.log(`[CALL] ✅ call:incoming sent to ${receiverId}`);
      } else {
        // Receiver offline — send FCM push notification
        try {
          const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id=?', [receiverId]);
          if (rows[0]?.fcm_token) {
            await sendPush(rows[0].fcm_token, {
              title: `📞 ${callerName} is calling`,
              body: `Incoming ${type} call`,
              data: { type: 'incoming_call', callId, callerId: userId, callerName, callerAvatar, channelName, callType: type },
            });
          }
        } catch (e) { console.error('[FCM] push failed:', e.message); }
        socket.emit('call:unavailable', { receiverId });
      }
    });

    socket.on('call:accepted',  ({ callerId })              => { const d = online.get(callerId);  if (d) io.to(d).emit('call:accepted',  {}); });
    socket.on('call:rejected',  ({ callerId })              => { const d = online.get(callerId);  if (d) io.to(d).emit('call:rejected'); });
    socket.on('call:ended',     ({ otherUserId })           => { const d = online.get(otherUserId); if (d) io.to(d).emit('call:ended'); });

    socket.on('room:join',    ({ roomId }) => { socket.join(`room:${roomId}`);  socket.to(`room:${roomId}`).emit('room:user_joined', { userId }); });
    socket.on('room:leave',   ({ roomId }) => { socket.leave(`room:${roomId}`); socket.to(`room:${roomId}`).emit('room:user_left',  { userId }); });
    socket.on('user:online', () => {
      if (socket.userId) {
        online.set(socket.userId, socket.id);
        pool.query('UPDATE users SET is_online=1 WHERE id=?', [socket.userId]).catch(() => {});
        console.log(`[SOCKET] 🟢 user:online: ${socket.userId}`);
      }
    });

    socket.on('user:offline', () => {
      if (socket.userId) {
        online.delete(socket.userId);
        pool.query('UPDATE users SET is_online=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
        console.log(`[SOCKET] ⚫ user:offline: ${socket.userId}`);
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        online.delete(socket.userId);
        pool.query('UPDATE users SET is_online=0, last_seen=NOW() WHERE id=?', [socket.userId]).catch(() => {});
      }
    });
  });
};
