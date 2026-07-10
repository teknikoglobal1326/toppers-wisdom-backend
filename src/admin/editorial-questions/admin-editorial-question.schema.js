const Joi = require('joi')

const langValueSchema = Joi.object({
    text: Joi.string().allow('', null),
    image: Joi.string().allow('', null),
})

const localizedSchema = Joi.object({
    en: langValueSchema,
    hi: langValueSchema,
})

const createEditorialQuestionSchema = Joi.object({
    test: Joi.string().hex().length(24),
    subject: Joi.string().hex().length(24).allow('', null),
    question: localizedSchema,
    options: Joi.array().items(localizedSchema).length(4),
    correctOption: Joi.number().integer().min(0).max(3),
    explanation: localizedSchema,
    sortOrder: Joi.number().integer().min(0),
    status: Joi.string().valid('active', 'inactive'),
})

const updateEditorialQuestionSchema = Joi.object({
    test: Joi.string().hex().length(24),
    subject: Joi.string().hex().length(24).allow('', null),
    question: localizedSchema,
    options: Joi.array().items(localizedSchema).length(4),
    correctOption: Joi.number().integer().min(0).max(3),
    explanation: localizedSchema,
    sortOrder: Joi.number().integer().min(0),
    status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listEditorialQuestionQuerySchema = Joi.object({
    test: Joi.string().hex().length(24),
    subject: Joi.string().hex().length(24),
    status: Joi.string().valid('active', 'inactive'),
    lang: Joi.string().valid('hi', 'en'),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string().valid('sortOrder', 'createdAt', 'updatedAt').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = {
    createEditorialQuestionSchema,
    updateEditorialQuestionSchema,
    listEditorialQuestionQuerySchema,
}