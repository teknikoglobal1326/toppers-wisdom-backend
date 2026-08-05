const Joi = require('joi')

const TYPE_VALUES = ['daily_editorial', 'ncert_based']
const STATUS_VALUES = ['draft', 'published', 'inactive']

const createEditorialSchema = Joi.object({
    title: Joi.string().trim().min(1).max(300),
    slug: Joi.string().trim().lowercase().max(300),
    type: Joi.string().valid(...TYPE_VALUES),
    bannerImage: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().max(500).allow(''),
    publishDate: Joi.date(),
    shortDescription: Joi.string().max(1000).allow(''),
    description: Joi.string().allow(''),
    videoUrl: Joi.string().max(500).allow(''),
    editorialTest: Joi.string().hex().length(24).allow(null, ''),
    editorialTopic: Joi.string().hex().length(24).allow(null, ''),
    isFree: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
    status: Joi.string().valid(...STATUS_VALUES),
    exam: Joi.array().items(Joi.string()).default([]),
    subjectIds: Joi.array().items(Joi.string()).default([]),
})

const updateEditorialSchema = Joi.object({
    title: Joi.string().trim().min(1).max(300),
    slug: Joi.string().trim().lowercase().max(300),
    type: Joi.string().valid(...TYPE_VALUES),
    bannerImage: Joi.string().max(500).allow(''),
    thumbnail: Joi.string().max(500).allow(''),
    publishDate: Joi.date(),
    shortDescription: Joi.string().max(1000).allow(''),
    description: Joi.string().allow(''),
    videoUrl: Joi.string().max(500).allow(''),
    editorialTest: Joi.string().hex().length(24).allow(null, ''),
    editorialTopic: Joi.string().hex().length(24).allow(null, ''),
    isFree: Joi.boolean(),
    sortOrder: Joi.number().integer().min(0),
    status: Joi.string().valid(...STATUS_VALUES),
    exam: Joi.array().items(Joi.string()),
    subjectIds: Joi.array().items(Joi.string()),
}).min(1)

const listEditorialQuerySchema = Joi.object({
    type: Joi.string().valid(...TYPE_VALUES),
    status: Joi.string().valid(...STATUS_VALUES),
    isFree: Joi.boolean(),
    editorialTest: Joi.string().hex().length(24),
    editorialTopic: Joi.string().hex().length(24),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string().valid('sortOrder', 'publishDate', 'createdAt', 'updatedAt', 'title').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

const upsertEditorialPlanSchema = Joi.object({
    title: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().allow(null, ''),
    price: Joi.number().min(0).default(0),
    discountPrice: Joi.number().min(0).default(0),
    validityInMonths: Joi.number().integer().min(1).default(12),
    status: Joi.string().valid('active', 'inactive').default('active')
})

module.exports = {
    createEditorialSchema,
    updateEditorialSchema,
    listEditorialQuerySchema,
    upsertEditorialPlanSchema,
}