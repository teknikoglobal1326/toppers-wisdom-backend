const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const listAttemptsQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    courseId: objectId,
    testId: objectId,
}).unknown(true)

const submitCourseTestSchema = Joi.object({
    answers: Joi.array().items(Joi.object({
        questionId: objectId.required(),
        selectedOption: Joi.number().integer().min(0).max(3).allow(null),
        status: Joi.string().valid('answered', 'skipped', 'visited', 'unattempted'),
        timeTaken: Joi.number().min(0),
    })).required(),
    timeTaken: Joi.number().min(0).required(),
})

const updateSessionSchema = Joi.object({
    answer: Joi.object({
        questionId: objectId.required(),
        selectedOption: Joi.number().integer().min(0).max(3).allow(null),
        status: Joi.string().valid('answered', 'skipped', 'visited', 'unattempted'),
        timeTaken: Joi.number().min(0),
    }),
    answers: Joi.array().items(Joi.object({
        questionId: objectId.required(),
        selectedOption: Joi.number().integer().min(0).max(3).allow(null),
        status: Joi.string().valid('answered', 'skipped', 'visited', 'unattempted'),
        timeTaken: Joi.number().min(0),
    })),
    status: Joi.string().valid('ongoing', 'completed', 'abandoned'),
}).or('answer', 'answers', 'status')

module.exports = {
    listAttemptsQuerySchema,
    submitCourseTestSchema,
    updateSessionSchema,
}
