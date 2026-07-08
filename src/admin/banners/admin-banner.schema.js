const Joi = require('joi')

const createBannerSchema = Joi.object({
  name: Joi.string().trim().required(),
  image: Joi.string().uri().optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0).default(0),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateBannerSchema = Joi.object({
  name: Joi.string().trim(),
  image: Joi.string().uri().optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language: Joi.string().valid('hi', 'en', 'both'),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const createBannerDualSchema = Joi.object({
  hi: createBannerSchema.required(),
  en: createBannerSchema.required(),
})

const listBannerQuerySchema = Joi.object({
  examId: Joi.string().hex().length(24),
  subexamId: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  language: Joi.string().valid('hi', 'en', 'both'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createBannerSchema, createBannerDualSchema, updateBannerSchema, listBannerQuerySchema }
