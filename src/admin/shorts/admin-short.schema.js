const Joi = require('joi')

const createShortSchema = Joi.object({
  title:     Joi.string().trim().required(),
  hiTitle:   Joi.string().trim().allow('', null).optional(),
  enTitle:   Joi.string().trim().allow('', null).optional(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language:  Joi.string().valid('hi', 'en', 'both').default('both'),
  status:    Joi.string().valid('active', 'inactive').default('active'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
})

const updateShortSchema = Joi.object({
  title:     Joi.string().trim(),
  hiTitle:   Joi.string().trim().allow('', null).optional(),
  enTitle:   Joi.string().trim().allow('', null).optional(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  language:  Joi.string().valid('hi', 'en', 'both'),
  status:    Joi.string().valid('active', 'inactive'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
}).min(1)

const createShortDualSchema = Joi.object({
  hi: createShortSchema.required(),
  en: createShortSchema.required(),
})

module.exports = { createShortSchema, createShortDualSchema, updateShortSchema }
