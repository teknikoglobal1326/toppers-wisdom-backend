const router = require('express').Router()
const controller = require('./live-test.controller')

// Admin/Utility/Helper routes
router.get('/syllabus', controller.getSyllabus)
router.post('/auto-generate-questions', controller.autoGenerateQuestions)

// User-side live test routes
router.get('/', controller.listLiveTests)
router.get('/attempts', controller.listMyAttempts)
router.get('/:id/instructions', controller.getLiveTestInstructions)
router.get('/:id/start-session', controller.startSession)
router.put('/:id/session/:sessionId/update', controller.updateSession)
router.get('/:id/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/:id/session/:sessionId/solution', controller.getSessionSolution)

module.exports = router
