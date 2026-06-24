const router = require('express').Router()
const controller = require('./auth.controller')
const { validate }        = require('../../core/validate')
const { authMiddleware }  = require('../../middlewares/auth.middleware')
const { otpLimiter }      = require('../../middlewares/rateLimiter.middleware')
const { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } = require('./auth.schema')

router.post('/send-otp', otpLimiter, validate(sendOtpSchema), controller.sendOtp)
router.post('/verify-otp', validate(verifyOtpSchema), controller.verifyOtp)
router.post('/refresh-token', validate(refreshTokenSchema), controller.refreshToken)
router.post('/logout', authMiddleware, controller.logout)

module.exports = router