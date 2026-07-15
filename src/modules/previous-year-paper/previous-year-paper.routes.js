const router = require('express').Router()
const controller = require('./previous-year-paper.controller')
const { validate, validateQuery } = require('../../core/validate')
const {
    listPreviousYearPapersQuerySchema,
    listPreviousYearPaperTestsQuerySchema,
    listPreviousYearPaperAttemptsQuerySchema,
    submitPreviousYearPaperTestSchema,
} = require('./previous-year-paper.schema')

router.get('/', validateQuery(listPreviousYearPapersQuerySchema), controller.listPreviousYearPapers)
router.get('/attempts', validateQuery(listPreviousYearPaperAttemptsQuerySchema), controller.listMyAttempts)
router.get('/tests/:testId/start', controller.startTest)
router.post('/tests/:testId/submit', validate(submitPreviousYearPaperTestSchema), controller.submitTest)

//previous year 
router.get('/pyqp/:testId/start-session', controller.startSession)
router.put('/pyqp/:testId/session/:sessionId/update', controller.updateSession)
router.get('/pyqp/:testId/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/pyqp/:testId/session/:sessionId/solution', controller.getSessionSolution)


router.get('/:id/tests', validateQuery(listPreviousYearPaperTestsQuerySchema), controller.listPreviousYearPaperTests)
router.get('/:id', controller.getPreviousYearPaper)

module.exports = router
