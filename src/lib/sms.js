const axios  = require('axios')
const config = require('../config/env')
const { createLogger } = require('../config/logger')

const logger = createLogger('sms')

const sendOtpSms = async (phone, otp) => {
  try {
    await axios.post('https://api.msg91.com/api/v5/flow/', {
      template_id: config.MSG91_TEMPLATE_ID, short_url: '0', mobiles: `91${phone}`, var1: otp,
    }, { headers: { authkey: config.MSG91_AUTH_KEY, 'Content-Type': 'application/json' } })
    logger.info({ phone }, 'OTP SMS sent')
  } catch (err) {
    logger.error({ err, phone }, 'SMS send failed')
  }
}

module.exports = { sendOtpSms }