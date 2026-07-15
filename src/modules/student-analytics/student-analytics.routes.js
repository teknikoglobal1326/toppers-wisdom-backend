const router = require('express').Router()
const controller = require('./student-analytics.controller')
const { validateQuery } = require('../../core/validate')
const {
    validateParams,
    typeParamsSchema,
    collectionParamsSchema,
    testParamsSchema,
    questionParamsSchema,
    listCollectionsQuerySchema,
} = require('./student-analytics.schema')

// Static segments MUST be registered before the dynamic '/:type' routes,
// otherwise 'test' and 'question' would be captured as a type param.

// 3. Particular test analytics
router.get('/test/:testId', validateParams(testParamsSchema), controller.getTestAnalytics)

// 4. Question analytics (aggregated across all students)
router.get('/question/:questionId', validateParams(questionParamsSchema), controller.getQuestionAnalytics)

// 1. All Test Series / PYQ collections with the logged-in user's analytics
router.get(
    '/:type',
    validateParams(typeParamsSchema),
    validateQuery(listCollectionsQuerySchema),
    controller.getCollectionsAnalytics
)

// 2. Particular Test Series / PYQ collection analytics
router.get('/:type/:collectionId', validateParams(collectionParamsSchema), controller.getCollectionAnalytics)

module.exports = router
