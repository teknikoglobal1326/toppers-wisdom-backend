const Joi = require('joi')

const createShortSchema = Joi.object({
  title:     Joi.string().trim().required(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0).default(0),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive').default('active'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
})

const updateShortSchema = Joi.object({
  title:     Joi.string().trim(),
  videoUrl:  Joi.string().max(500).optional().allow(null, ''),
  sortOrder: Joi.number().integer().min(0),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive'),
  thumbnail: Joi.string().max(500).optional().allow(null, ''),
}).min(1)

const createShortDualSchema = Joi.object({
  hi: createShortSchema.required(),
  en: createShortSchema.required(),
})

const listShortQuerySchema = Joi.object({
  examId: Joi.string().hex().length(24),
  subexamId: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createShortSchema, createShortDualSchema, updateShortSchema, listShortQuerySchema }
