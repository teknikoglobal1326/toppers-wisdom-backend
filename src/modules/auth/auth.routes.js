const router = require('express').Router()
const controller = require('./auth.controller')
const { validate } = require('../../core/validate')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { otpLimiter } = require('../../middlewares/rateLimiter.middleware')
const { uploadAvatar, parseFormData } = require('./auth.upload')
const { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, updatePasswordSchema, updateProfileSchema, loginSchema } = require('./auth.schema')

router.post('/login', validate(loginSchema), controller.login)
router.post('/send-otp', otpLimiter, validate(sendOtpSchema), controller.sendOtp)
router.post('/verify-otp', validate(verifyOtpSchema), controller.verifyOtp)
router.post('/refresh-token', validate(refreshTokenSchema), controller.refreshToken)
router.post('/logout', authMiddleware, controller.logout)
router.put('/update-password', authMiddleware, validate(updatePasswordSchema), controller.updatePassword)
router.put('/update-profile', authMiddleware, uploadAvatar, parseFormData, validate(updateProfileSchema), controller.updateProfile)
router.delete('/delete-account', authMiddleware, controller.deleteAccount)

module.exports = router 