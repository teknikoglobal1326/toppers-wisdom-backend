const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

/**
 * Generate Agora RTC token
 * @param {string} channelName The channel name
 * @param {number} role RtcRole.PUBLISHER or RtcRole.SUBSCRIBER
 * @param {string|number} uid The user ID (optional, 0 means any user)
 * @param {number} expireTime Expiration time in seconds from now
 */
const generateToken = (channelName, role, uid = 0, expireTime = 3600) => {
  if (!APP_ID || !APP_CERTIFICATE) {
    throw new Error('Agora App ID and Certificate are required in .env');
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expireTime;

  return RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );
};

const generatePublisherToken = (channelName, uid = 0, expireTime = 86400) => {
  return generateToken(channelName, RtcRole.PUBLISHER, uid, expireTime);
};

const generateSubscriberToken = (channelName, uid = 0, expireTime = 86400) => {
  return generateToken(channelName, RtcRole.SUBSCRIBER, uid, expireTime);
};

module.exports = {
  generatePublisherToken,
  generateSubscriberToken,
};
