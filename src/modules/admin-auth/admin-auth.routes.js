const router = require('express').Router()
const controller = require('./admin-auth.controller')
const { validate }            = require('../../core/validate')
const { adminAuthMiddleware } = require('../../middlewares/adminAuth.middleware')
const { loginSchema, refreshTokenSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('./admin-auth.schema')

router.post('/login',            validate(loginSchema),           controller.login)
router.post('/member-login',     validate(loginSchema),           controller.memberLogin)
router.post('/refresh-token',    validate(refreshTokenSchema),    controller.refreshToken)
router.post('/logout',           adminAuthMiddleware,              controller.logout)
router.patch('/change-password', adminAuthMiddleware, validate(changePasswordSchema), controller.changePassword)
router.post('/forgot-password',  validate(forgotPasswordSchema),  controller.forgotPassword)
router.post('/reset-password',   validate(resetPasswordSchema),   controller.resetPassword)

module.exports = router