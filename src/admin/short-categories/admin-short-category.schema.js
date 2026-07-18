const Joi = require('joi')

const createShortCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  bannerImage: Joi.string().max(500).optional().allow(null, ''),
  logo: Joi.string().max(500).optional().allow(null, ''),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  examIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().hex().length(24)),
    Joi.string().hex().length(24)
  ).optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateShortCategorySchema = Joi.object({
  name: Joi.string().trim(),
  bannerImage: Joi.string().max(500).optional().allow(null, ''),
  logo: Joi.string().max(500).optional().allow(null, ''),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string()),
    Joi.string()
  ).optional(),
  examIds: Joi.alternatives().try(
    Joi.array().items(Joi.string().hex().length(24)),
    Joi.string().hex().length(24)
  ).optional(),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listShortCategoryQuerySchema = Joi.object({
  examId: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createShortCategorySchema, updateShortCategorySchema, listShortCategoryQuerySchema }
