const rateLimit = require('express-rate-limit')

const otpLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 100, message: { success: false, error: { message: 'Too many OTP requests. Try in 1 hour.' } } })
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, error: { message: 'Too many requests.' } } })
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })

module.exports = { otpLimiter, apiLimiter, adminLimiter }