const Joi = require('joi')

const updateLeadGenerateSchema = Joi.object({
  isRead: Joi.boolean().required(),
})

const listLeadGenerateQuerySchema = Joi.object({
  isRead: Joi.alternatives().try(Joi.boolean(), Joi.string()).optional(),
  purposeType: Joi.string().optional(),
  subType: Joi.string().optional(),
  visitType: Joi.string().optional(),
  leadStatus: Joi.string().valid('hot', 'warm', 'cold', 'all').optional(),
  search: Joi.string().trim().allow('').optional(),
  startDate: Joi.string().allow('').optional(),
  endDate: Joi.string().allow('').optional(),
  sortBy: Joi.string().default('createdAt'),
  sortOrder: Joi.number().valid(1, -1).default(-1),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).default(20),
}).unknown(true)

module.exports = {
  updateLeadGenerateSchema,
  listLeadGenerateQuerySchema
}
