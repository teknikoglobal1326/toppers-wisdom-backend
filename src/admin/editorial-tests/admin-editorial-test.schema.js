const Joi = require('joi')

const STATUS_VALUES = ['draft', 'published', 'inactive']

const createEditorialTestSchema = Joi.object({
    title: Joi.string().trim().min(1).max(300),
    slug: Joi.string().trim().lowercase().max(300),
    thumbnailImage: Joi.string().max(500).allow(''),
    description: Joi.string().allow(''),
    instructions: Joi.string().allow(''),
    subjects: Joi.array().items(Joi.string().hex().length(24)).default([]),
    duration: Joi.number().min(0),
    totalQuestions: Joi.number().integer().min(0),
    mappedQuestions: Joi.number().integer().min(0),
    totalMarks: Joi.number().min(0),
    passingMarks: Joi.number().min(0),
    isNegativeMarking: Joi.boolean(),
    negativeMarks: Joi.number().min(0),
    marksPerQuestion: Joi.number().min(0),
    status: Joi.string().valid(...STATUS_VALUES),
    isFree: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
})

const updateEditorialTestSchema = Joi.object({
    title: Joi.string().trim().min(1).max(300),
    slug: Joi.string().trim().lowercase().max(300),
    thumbnailImage: Joi.string().max(500).allow(''),
    description: Joi.string().allow(''),
    instructions: Joi.string().allow(''),
    subjects: Joi.array().items(Joi.string().hex().length(24)),
    duration: Joi.number().min(0),
    totalQuestions: Joi.number().integer().min(0),
    mappedQuestions: Joi.number().integer().min(0),
    totalMarks: Joi.number().min(0),
    passingMarks: Joi.number().min(0),
    isNegativeMarking: Joi.boolean(),
    negativeMarks: Joi.number().min(0),
    marksPerQuestion: Joi.number().min(0),
    status: Joi.string().valid(...STATUS_VALUES),
    isFree: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
}).min(1)

const listEditorialTestQuerySchema = Joi.object({
    status: Joi.string().valid(...STATUS_VALUES),
    isFree: Joi.boolean(),
    subject: Joi.string().hex().length(24),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string().valid('sortOrder', 'duration', 'totalQuestions', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createEditorialTestSchema, updateEditorialTestSchema, listEditorialTestQuerySchema }