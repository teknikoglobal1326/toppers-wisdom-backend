const router     = require('express').Router()
const controller = require('./user.controller')
const { validate } = require('../../core/validate')
const { updateProfileSchema, setupProfileSchema, updateFcmSchema } = require('./user.schema')

router.get('/me',                             controller.getMe)
router.patch('/me',     validate(updateProfileSchema), controller.updateProfile)
router.post('/me/setup', validate(setupProfileSchema), controller.setupProfile)
router.get('/me/stats',                       controller.getStats)
router.get('/me/saved',                       controller.getSaved)
router.delete('/me/saved/:itemId',            controller.removeSaved)
router.get('/me/orders',                      controller.getOrders)
router.get('/me/notifications',               controller.getNotifications)
router.patch('/me/notifications/:id/read',    controller.markNotifRead)
router.patch('/me/fcm-token', validate(updateFcmSchema), controller.updateFcmToken)

module.exports = router
