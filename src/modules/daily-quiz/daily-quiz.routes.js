const router = require('express').Router()
const controller = require('./daily-quiz.controller')

router.get('/', controller.listQuizzes)
router.get('/stats', controller.getStats)
router.get('/attempts', controller.listMyAttempts)
router.get('/:id/instructions', controller.getQuizInstructions)
router.get('/:id/start-session', controller.startSession)
router.put('/:id/session/:sessionId/update', controller.updateSession)
router.get('/:id/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/:id/session/:sessionId/solution', controller.getSessionSolution)

module.exports = router
