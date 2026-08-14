const router = require('express').Router()
const controller = require('./admin-dashboard.controller')

router.get('/stats', controller.getDashboardStats)
router.get('/enrollment-stats', controller.getEnrollmentStats)
router.get('/revenue-stats', controller.getRevenueStats)
router.get('/upcoming-live-classes', controller.getUpcomingLiveClasses)

module.exports = router
