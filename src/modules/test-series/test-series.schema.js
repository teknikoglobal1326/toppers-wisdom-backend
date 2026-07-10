const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const listSeriesQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    q: Joi.string().trim().max(200).allow(''),
    examId: objectId,
    subExamId: objectId,
    subjectId: objectId,
    status: Joi.string().valid('active', 'inactive'),
    sortBy: Joi.string().valid('createdAt', 'title').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
}).unknown(true)

const listSeriesTestsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    q: Joi.string().trim().max(200).allow(''),
    subjectId: objectId,
    topicId: objectId,
    chapterTitle: Joi.string().trim().max(200),
    status: Joi.string().valid('active', 'inactive'),
    sortBy: Joi.string().valid('createdAt', 'title', 'duration', 'totalQuestions').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
}).unknown(true)

const listAttemptsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    seriesId: objectId,
    testId: objectId,
}).unknown(true)

const submitSeriesTestSchema = Joi.object({
    answers: Joi.array().items(Joi.object({
        questionId: objectId.required(),
        selectedOption: Joi.number().integer().min(0).max(3).allow(null),
    })).required(),
    timeTaken: Joi.number().min(0).required(),
})

module.exports = {
    listSeriesQuerySchema,
    listSeriesTestsQuerySchema,
    listAttemptsQuerySchema,
    submitSeriesTestSchema,
}
