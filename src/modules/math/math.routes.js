const router = require('express').Router()
const controller = require('./math.controller')
const { validate, validateQuery } = require('../../core/validate')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const {
    listMathQuerySchema,
    listMathTestsQuerySchema,
    listAttemptsQuerySchema,
    submitMathTestSchema,
} = require('./math.schema')

router.use(authMiddleware)

router.get('/', validateQuery(listMathQuerySchema), controller.listSeries)
router.get('/attempts', validateQuery(listAttemptsQuerySchema), controller.listMyAttempts)
router.get('/tests/:testId/instructions', controller.getTestInstructions)
router.get('/tests/:testId/start', controller.startTest)
router.post('/tests/:testId/submit', validate(submitMathTestSchema), controller.submitTest)

router.get('/tests/:testId/start-session', controller.startSession)
router.put('/tests/:testId/session/:sessionId/update', controller.updateSession)
router.get('/tests/:testId/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/tests/:testId/session/:sessionId/solution', controller.getSessionSolution)
router.get('/:id/tests', validateQuery(listMathTestsQuerySchema), controller.listSeriesTests)
router.get('/:id', controller.getSeries)

module.exports = router
