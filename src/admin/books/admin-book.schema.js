const Joi = require('joi')
const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
})

const createBookSchema = Joi.object({
    title: Joi.string().trim().required(),
    author: Joi.string().trim().optional().allow(null, ''),
    coverImage: Joi.string().uri().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    price: Joi.number().min(0).optional().default(0),
    isFree: Joi.boolean().optional().default(false),
    section: Joi.string().valid('eBooks', 'books', 'audioBooks').default('books'),
    buyUrl: Joi.string().uri().optional().allow(null, ''),
    pages: Joi.number().integer().min(0).optional().default(0),
    rating: Joi.number().min(0).max(5).optional().default(0),
    tags: Joi.array().items(Joi.string()).optional().default([]),
    examId: objectId.optional().allow(null),
    exam: objectId.optional().allow(null),
    subExamId: objectId.optional().allow(null),
    subExamIds: Joi.array().items(objectId).optional().default([]),
    subExam: objectId.optional().allow(null),
    status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateBookSchema = Joi.object({
    title: Joi.string().trim(),
    author: Joi.string().trim().optional().allow(null, ''),
    coverImage: Joi.string().uri().optional().allow(null, ''),
    description: Joi.string().optional().allow(null, ''),
    price: Joi.number().min(0).optional(),
    isFree: Joi.boolean().optional(),
    section: Joi.string().valid('myBooks', 'eBooks', 'books', 'audioBooks'),
    buyUrl: Joi.string().uri().optional().allow(null, ''),
    pages: Joi.number().integer().min(0).optional(),
    rating: Joi.number().min(0).max(5).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    examId: objectId.optional().allow(null),
    exam: objectId.optional().allow(null),
    subExamId: objectId.optional().allow(null),
    subExamIds: Joi.array().items(objectId).optional(),
    subExam: objectId.optional().allow(null),
    status: Joi.string().valid('active', 'inactive'),
}).min(1)

const setBuyUrlSchema = Joi.object({
    buyUrl: Joi.string().uri().required(),
})

module.exports = { createBookSchema, updateBookSchema, setBuyUrlSchema }
