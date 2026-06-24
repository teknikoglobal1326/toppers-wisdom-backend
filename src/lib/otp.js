const redis = require('../config/redis')
const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('otp')

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()
const storeOtp = async (phone, otp) => { await redis.set(`otp:${phone}`, otp, 'EX', 300); logger.debug({ phone }, 'OTP stored') }

const verifyOtp = async (phone, otp) => {
  const stored = await redis.get(`otp:${phone}`)
  if (!stored) { logger.warn({ phone }, 'OTP expired'); throw new AppError('OTP expired. Request a new one.', 400, 'OTP_EXPIRED') }
  if (stored !== otp) { logger.warn({ phone }, 'Wrong OTP');   throw new AppError('Invalid OTP', 400, 'INVALID_OTP') }
  await redis.del(`otp:${phone}`)
  logger.info({ phone }, 'OTP verified')
}

const checkRateLimit = async (phone) => {
  const key   = `otp_attempts:${phone}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 3600)
  if (count > 5) { logger.warn({ phone, count }, 'OTP rate limit hit'); throw new AppError('Too many OTP requests. Try after 1 hour.', 429, 'RATE_LIMIT') }
}

module.exports = { generateOtp, storeOtp, verifyOtp, checkRateLimit }