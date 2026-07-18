const router     = require('express').Router()
const controller = require('./admin-analytics.controller')
const { validateQuery } = require('../../core/validate')
const { analyticsListQuerySchema } = require('./admin-analytics.schema')

router.get('/overview', controller.overview)
router.get('/revenue',  controller.revenue)
router.get('/users',    controller.users)
router.get('/course-enrollments/:courseId', validateQuery(analyticsListQuerySchema), controller.courseEnrollments)
router.get('/test-series-attempts/:testSeriesId', validateQuery(analyticsListQuerySchema), controller.testSeriesAttempts)
router.get('/test-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema),controller.testLeaderboard)

module.exports = router
