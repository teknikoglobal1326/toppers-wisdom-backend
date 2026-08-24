const router = require('express').Router()
const controller = require('./editorial.controller')
const { validate, validateQuery } = require('../../core/validate')
const {
  listEditorialQuerySchema,
  setEditorialLikeSchema,
  setEditorialReadSchema,
  setEditorialBookmarkSchema,
  submitEditorialTestSchema
} = require('./editorial.schema')
const { listVocabQuerySchema } = require('../editorial-vocabulary/editorial-vocabulary.schema')

router.get('/purchase-status', controller.getPurchaseStatus)
router.post('/purchase', controller.purchaseSection)
router.get('/active-plan', controller.getActivePlan)
router.get('/tests', controller.listTests)

router.get('/tests/:testId/instructions', controller.getTestInstructions)
router.get('/tests/:testId/start', controller.startTest)
router.post('/tests/:testId/submit', validate(submitEditorialTestSchema), controller.submitTest)
router.get('/tests/:testId/start-session', controller.startSession)
router.put('/tests/:testId/session/:sessionId/update', controller.updateSession)
router.get('/tests/:testId/session/:sessionId/analytics', controller.getSessionAnalytics)
router.get('/tests/:testId/session/:sessionId/solution', controller.getSessionSolution)

router.get('/', validateQuery(listEditorialQuerySchema), controller.list)
router.patch('/read/:id', validate(setEditorialReadSchema), controller.setRead)
router.patch('/bookmark/:id', validate(setEditorialBookmarkSchema), controller.setBookmark)
router.patch('/:id/like', validate(setEditorialLikeSchema), controller.setLike)
router.get('/topics', controller.getTopics)
router.get('/:id/tests', controller.getEditorialTests)
router.get('/:id/vocabulary', validateQuery(listVocabQuerySchema), controller.getEditorialVocabulary)
router.get('/:id', controller.getOne)

module.exports = router
