const router = require('express').Router()
const controller = require('./user.controller')
const { validate } = require('../../core/validate')
const { updateProfileSchema, setupProfileSchema, updateFcmSchema, createReportSchema, createMcqReportSchema, saveQuestionSchema } = require('./user.schema')

router.get('/me', controller.getMe)
router.patch('/me', validate(updateProfileSchema), controller.updateProfile)
router.post('/me/setup', validate(setupProfileSchema), controller.setupProfile)
router.get('/me/stats', controller.getStats)
router.get('/me/common-stats', controller.getCommonStudyStats)
router.get('/me/saved', controller.getSaved)
router.delete('/me/saved/:itemId', controller.removeSaved)
router.get('/me/orders', controller.getOrders)
router.get('/me/notifications', controller.getNotifications)
router.get('/me/notifications/unread-count', controller.getUnreadNotificationCount)
router.patch('/me/notifications/:id/read', controller.markNotifRead)
router.delete('/me/notifications/:id', controller.deleteNotification)
router.patch('/me/fcm-token', validate(updateFcmSchema), controller.updateFcmToken)
router.post('/me/reports', validate(createReportSchema), controller.createReport)
router.get('/me/reports', controller.getMyReports)
router.get('/me/reports/:itemId', controller.getMyReportByItemId)
router.post('/question-reports', validate(createMcqReportSchema), controller.createMcqReport)
router.get('/question-reports', controller.getMyMcqReports)
router.get('/question-reports/:itemId', controller.getMyMcqReportByItemId)

router.post('/me/saved-questions', validate(saveQuestionSchema), controller.saveQuestion)
router.delete('/me/saved-questions/:questionId', controller.unsaveQuestion)
router.get('/me/saved-questions', controller.getSavedQuestions)

router.post('/me/test-notification', controller.sendTestNotification)

router.get('/premium-plan', controller.getPremiumPlan)

module.exports = router
