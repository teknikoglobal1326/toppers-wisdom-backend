const Joi = require('joi')

const createBannerSchema = Joi.object({
  name: Joi.string().trim().required(),
  image: Joi.string().uri().optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateBannerSchema = Joi.object({
  name: Joi.string().trim(),
  image: Joi.string().uri().optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language: Joi.string().valid('hi', 'en', 'both'),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const createBannerDualSchema = Joi.object({
  hi: createBannerSchema.required(),
  en: createBannerSchema.required(),
})

module.exports = { createBannerSchema, createBannerDualSchema, updateBannerSchema }
