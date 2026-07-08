const Joi = require('joi')

const objectId = Joi.string().hex().length(24)
const objectIdOrArray = Joi.alternatives().try(
    Joi.array().items(objectId),
    objectId,
)

const createPreviousYearPaperSchema = Joi.object({
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    examId: objectId.optional().allow(null, ''),
    subExamIds: objectIdOrArray.optional().allow(null),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
})

const updatePreviousYearPaperSchema = Joi.object({
    title: Joi.string().trim(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    examId: objectId.optional().allow(null, ''),
    subExamIds: objectIdOrArray.optional().allow(null),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
}).min(1)

module.exports = { createPreviousYearPaperSchema, updatePreviousYearPaperSchema }
