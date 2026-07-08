const Joi = require('joi')

const createLiveTestSchema = Joi.object({
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
    startDateTime: Joi.date().required(),
    endDateTime: Joi.date().greater(Joi.ref('startDateTime')).required(),
    isPaid: Joi.boolean().optional().default(false),
    status: Joi.string().valid('active', 'inactive').optional().default('active'),
    language: Joi.string().valid('en', 'hi').optional().default('en'),
})

const updateLiveTestSchema = Joi.object({
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
    startDateTime: Joi.date(),
    endDateTime: Joi.date(),
    isPaid: Joi.boolean().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
    language: Joi.string().valid('en', 'hi').optional(),
}).min(1)

module.exports = { createLiveTestSchema, updateLiveTestSchema }
