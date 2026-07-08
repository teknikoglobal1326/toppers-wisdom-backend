const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const baseSchema = {
    title: Joi.string().trim().required(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    duration: Joi.number().integer().min(1).required(),
    totalQuestions: Joi.number().integer().min(1).required(),
    totalMarks: Joi.number().min(0).required(),
    marksPerQuestion: Joi.number().min(0).required(),
    negativeMarks: Joi.number().min(0).required(),
    passingMarks: Joi.number().min(0).required(),
    instructions: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
    language: Joi.string().valid('en', 'hi').optional().default('en'),
}

const createPreviousYearPaperTestSchema = Joi.object({
    previousYearPaperId: objectId.required(),
    ...baseSchema,
})

const updatePreviousYearPaperTestSchema = Joi.object({
    previousYearPaperId: objectId.optional(),
    title: Joi.string().trim(),
    description: Joi.string().optional().allow(null, ''),
    thumbnail: Joi.string().optional().allow(null, ''),
    duration: Joi.number().integer().min(1),
    totalQuestions: Joi.number().integer().min(1),
    totalMarks: Joi.number().min(0),
    marksPerQuestion: Joi.number().min(0),
    negativeMarks: Joi.number().min(0),
    passingMarks: Joi.number().min(0),
    instructions: Joi.string().optional().allow(null, ''),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    language: Joi.string().valid('en', 'hi').optional(),
}).min(1)

module.exports = { createPreviousYearPaperTestSchema, updatePreviousYearPaperTestSchema }
