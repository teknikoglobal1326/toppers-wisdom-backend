const Joi = require('joi')

const createShortSchema = Joi.object({
  title:     Joi.string().trim().required(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive').default('active'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
})

const updateShortSchema = Joi.object({
  title:     Joi.string().trim(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
}).min(1)

const createShortDualSchema = Joi.object({
  hi: createShortSchema.required(),
  en: createShortSchema.required(),
})

module.exports = { createShortSchema, createShortDualSchema, updateShortSchema }
