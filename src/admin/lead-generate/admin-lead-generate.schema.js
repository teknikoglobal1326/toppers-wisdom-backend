const Joi = require('joi')

const updateLeadGenerateSchema = Joi.object({
  isRead: Joi.boolean().required(),
})

const listLeadGenerateQuerySchema = Joi.object({
  isRead: Joi.boolean().optional(),
  purposeType: Joi.string().valid('course', 'subscription').optional(),
  subType: Joi.string().valid('course', 'test-series', 'previous-year-paper').optional(),
  visitType: Joi.string().valid('detail', 'checkout', 'contentCheckout').optional(),
  search: Joi.string().trim().allow('').optional(),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'timestamp').default('createdAt'),
  sortOrder: Joi.number().valid(1, -1).default(-1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(20),
}).unknown(true)

module.exports = {
  updateLeadGenerateSchema,
  listLeadGenerateQuerySchema
}
