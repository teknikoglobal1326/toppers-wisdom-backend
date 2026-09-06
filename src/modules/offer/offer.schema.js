const Joi = require('joi')

const createOfferSchema = Joi.object({
  title: Joi.string().trim().required(),
  image: Joi.string().uri().optional().allow(null, ''),
  type: Joi.string().valid('course', 'testSeries').required(),
  itemId: Joi.string().hex().length(24).required(),
  exams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  subExams: Joi.alternatives().try(Joi.array().items(Joi.string()), Joi.string()).optional(),
  isActive: Joi.boolean().default(true),
})

const updateOfferSchema = Joi.object({
  title: Joi.string().trim(),
  image: Joi.string().uri().optional().allow(null, ''),
  type: Joi.string().valid('course', 'testSeries'),
  itemId: Joi.string().hex().length(24),
  isActive: Joi.boolean(),
}).min(1)

const listOfferQuerySchema = Joi.object({
  type: Joi.string().valid('course', 'testSeries'),
  itemId: Joi.string().hex().length(24),
  isActive: Joi.boolean(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = {
  createOfferSchema,
  updateOfferSchema,
  listOfferQuerySchema,
}
