const Joi = require('joi')
const AppError = require('../../core/AppError')

const objectId = Joi.string().hex().length(24)

const ANALYTICS_TYPES = ['test-series', 'pyq']

/**
 * Params validator (local to this module — core/validate.js only ships
 * body/query validators and must not be modified for this feature).
 * Usage: router.get('/:type', validateParams(schema), controller.fn)
 */
const validateParams = (schema) => (req, _res, next) => {
    const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: false,
        convert: true,
    })

    if (error) {
        const messages = error.details.map((d) => d.message).join(', ')
        return next(new AppError(messages, 400, 'VALIDATION_ERROR'))
    }

    req.params = value
    next()
}

const typeParamsSchema = Joi.object({
    type: Joi.string().valid(...ANALYTICS_TYPES).required()
        .messages({ 'any.only': 'type must be one of [test-series, pyq]' }),
})

const collectionParamsSchema = Joi.object({
    type: Joi.string().valid(...ANALYTICS_TYPES).required()
        .messages({ 'any.only': 'type must be one of [test-series, pyq]' }),
    collectionId: objectId.required()
        .messages({ 'string.hex': 'collectionId must be a valid id', 'string.length': 'collectionId must be a valid id' }),
})

const testParamsSchema = Joi.object({
    testId: objectId.required()
        .messages({ 'string.hex': 'testId must be a valid id', 'string.length': 'testId must be a valid id' }),
})

const questionParamsSchema = Joi.object({
    questionId: objectId.required()
        .messages({ 'string.hex': 'questionId must be a valid id', 'string.length': 'questionId must be a valid id' }),
})

const listCollectionsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    q: Joi.string().trim().max(200).allow(''),
    examId: objectId,
    subExamId: objectId,
    subjectId: objectId,
}).unknown(true)

module.exports = {
    ANALYTICS_TYPES,
    validateParams,
    typeParamsSchema,
    collectionParamsSchema,
    testParamsSchema,
    questionParamsSchema,
    listCollectionsQuerySchema,
}
