const Joi = require('joi')

const createOfferSchema = Joi.object({
  title: Joi.string().trim().required(),
  image: Joi.string().optional().allow(null, ''),
  type: Joi.string().valid('course', 'testSeries', 'subscription').required(),
  itemId: Joi.string().hex().length(24).optional().allow(null, ''),
  exams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  subExams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  subscriptions: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  isActive: Joi.boolean().default(true),
})

const updateOfferSchema = Joi.object({
  title: Joi.string().trim(),
  image: Joi.string().optional().allow(null, ''),
  type: Joi.string().valid('course', 'testSeries', 'subscription'),
  itemId: Joi.string().hex().length(24).optional().allow(null, ''),
  exams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  subExams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  subscriptions: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  isActive: Joi.boolean(),
}).min(1)

const listOfferQuerySchema = Joi.object({
  type: Joi.string().valid('course', 'testSeries', 'subscription'),
  itemId: Joi.string().hex().length(24),
  isActive: Joi.boolean().optional(),
  latest: Joi.boolean().optional(),
  search: Joi.string().trim().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'title', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
}).unknown(true)

module.exports = {
  createOfferSchema,
  updateOfferSchema,
  listOfferQuerySchema,
}
