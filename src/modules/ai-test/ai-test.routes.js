const router = require('express').Router()
const controller = require('./ai-test.controller')
const { validate } = require('../../core/validate')
const { generateAiTestSchema, updateSessionSchema } = require('./ai-test.schema')

router.get('/subjects', controller.getSubjects)
router.get('/subjects/chapters/:subjectId', controller.getChapters)
router.get('/subject/topics/:subjectId/:chapterId', controller.getTopics)
router.post('/generate', validate(generateAiTestSchema), controller.generateAiTest)
router.get('/:id/questions', controller.getQuestions)

router.get('/:id/start-session', controller.startSession)
router.put('/:id/session/:sessionId/update', validate(updateSessionSchema), controller.updateSession)
router.get('/:id/session/:sessionId/analytics', controller.getSessionAnalytics)

module.exports = router
