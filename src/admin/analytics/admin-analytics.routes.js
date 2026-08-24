const router     = require('express').Router()
const controller = require('./admin-analytics.controller')
const { validateQuery } = require('../../core/validate')
const { analyticsListQuerySchema } = require('./admin-analytics.schema')

router.get('/overview', controller.overview)
router.get('/revenue',  controller.revenue)
router.get('/users',    controller.users)
router.get('/course-enrollments/:courseId', validateQuery(analyticsListQuerySchema), controller.courseEnrollments)
router.get('/test-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema),controller.testLeaderboard)
router.get('/previous-year-paper-test-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema), controller.previousYearPaperTestLeaderboard)
router.get('/course-test-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema), controller.courseTestLeaderboard)
router.get('/daily-quiz-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema), controller.dailyQuizLeaderboard)
router.get('/live-test-attempts/:testId/leaderboard', validateQuery(analyticsListQuerySchema), controller.liveTestLeaderboard)

module.exports = router
