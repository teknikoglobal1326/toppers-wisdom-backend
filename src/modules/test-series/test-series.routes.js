const router = require('express').Router()
const controller = require('./test-series.controller')
const { validate, validateQuery } = require('../../core/validate')
const {
    listSeriesQuerySchema,
    listSeriesTestsQuerySchema,
    listAttemptsQuerySchema,
    submitSeriesTestSchema,
} = require('./test-series.schema')

router.get('/', validateQuery(listSeriesQuerySchema), controller.listSeries)
router.get('/attempts', validateQuery(listAttemptsQuerySchema), controller.listMyAttempts)
router.get('/tests/:testId/start', controller.startTest)
router.post('/tests/:testId/submit', validate(submitSeriesTestSchema), controller.submitTest)
router.get('/tests/:testId/start-session', controller.startSession)
router.put('/tests/:testId/session/:sessionId/update', controller.updateSession)
router.get('/tests/:testId/session/:sessionId/solution', controller.getSessionSolution)
router.get('/:id/tests', validateQuery(listSeriesTestsQuerySchema), controller.listSeriesTests)
router.get('/:id', controller.getSeries)

module.exports = router
