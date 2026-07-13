const Joi = require('joi')

const listFaqQuerySchema = Joi.object({
    courseId: Joi.string().hex().length(24),
    search: Joi.string().trim().max(300),
    sortBy: Joi.string().valid('sortOrder', 'question', 'createdAt', 'updatedAt').default('sortOrder'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { listFaqQuerySchema }
