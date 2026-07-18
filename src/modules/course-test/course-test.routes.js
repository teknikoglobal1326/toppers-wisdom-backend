const router = require('express').Router()
const controller = require('./course-test.controller')
const { validate, validateQuery } = require('../../core/validate')
const {
    listAttemptsQuerySchema,
    submitCourseTestSchema,
    updateSessionSchema,
} = require('./course-test.schema')

// List user's past attempts
router.get('/attempts', validateQuery(listAttemptsQuerySchema), controller.listMyAttempts)

// Simple one-shot test flow (legacy / no session)
router.get('/:CourseTestId/start', controller.startTest)
router.post('/:CourseTestId/submit', validate(submitCourseTestSchema), controller.submitTest)

// Session-based test flow (recommended)
router.get('/:CourseTestId/start-session', controller.startSession)
router.put('/:CourseTestId/session/:sessionId/update', validate(updateSessionSchema), controller.updateSession)
router.get('/:CourseTestId/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/:CourseTestId/session/:sessionId/solution', controller.getSessionSolution)

module.exports = router
