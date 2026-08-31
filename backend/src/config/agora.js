const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

function generateAgoraToken(channelName, uid) {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  return RtcTokenBuilder.buildTokenWithUid(
    appId, appCertificate, channelName, uid, RtcRole.PUBLISHER, expiresAt
  );
}

module.exports = { generateAgoraToken };
