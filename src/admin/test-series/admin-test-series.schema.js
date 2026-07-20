const Joi = require('joi')

const objectId = Joi.string().hex().length(24)
const objectIdOrArray = Joi.alternatives().try(
    Joi.array().items(objectId),
    objectId,
)

const createTestSeriesSchema = Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    examId: objectId.optional().allow(null, ''),
    subExamIds: objectIdOrArray.optional().allow(null),
    subjectIds: objectIdOrArray.optional().allow(null),
    chapterIds: objectIdOrArray.optional().allow(null),
    topicIds: objectIdOrArray.optional().allow(null),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
})

const updateTestSeriesSchema = Joi.object({
    title: Joi.string().trim(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    examId: objectId.optional().allow(null, ''),
    subExamIds: objectIdOrArray.optional().allow(null),
    subjectIds: objectIdOrArray.optional().allow(null),
    chapterIds: objectIdOrArray.optional().allow(null),
    topicIds: objectIdOrArray.optional().allow(null),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
}).min(1)

module.exports = { createTestSeriesSchema, updateTestSeriesSchema }
