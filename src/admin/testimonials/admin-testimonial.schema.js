const Joi = require('joi')

const createTestimonialSchema = Joi.object({
  name: Joi.string().trim().required(),
  exam: Joi.string().trim().required(),
  rank: Joi.string().trim().allow('').optional().default(''),
  year: Joi.string().trim().allow('').optional().default(''),
  priority: Joi.number().integer().min(0).default(0),
  stats: Joi.string().trim().allow('').optional().default(''),
  image: Joi.string().trim().allow('', null).optional(),
  reviewText: Joi.string().trim().required()
})

const updateTestimonialSchema = Joi.object({
  name: Joi.string().trim().optional(),
  exam: Joi.string().trim().optional(),
  rank: Joi.string().trim().allow('').optional(),
  year: Joi.string().trim().allow('').optional(),
  priority: Joi.number().integer().min(0).optional(),
  stats: Joi.string().trim().allow('').optional(),
  image: Joi.string().trim().allow('', null).optional(),
  reviewText: Joi.string().trim().optional()
}).min(1)

const listTestimonialQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
})

module.exports = {
  createTestimonialSchema,
  updateTestimonialSchema,
  listTestimonialQuerySchema
}
