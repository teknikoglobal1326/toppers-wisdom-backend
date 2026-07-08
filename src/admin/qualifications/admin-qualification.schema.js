const Joi = require('joi')

const createQualificationSchema = Joi.object({
  name:      Joi.string().trim().required(),
  language:  Joi.string().valid('hi', 'en', 'both').default('both'),
  isActive:  Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const updateQualificationSchema = Joi.object({
  name:      Joi.string().trim(),
  language:  Joi.string().valid('hi', 'en', 'both'),
  isActive:  Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).min(1)

const createQualificationDualSchema = Joi.object({
  hi: createQualificationSchema.required(),
  en: createQualificationSchema.required(),
})

const listQualificationQuerySchema = Joi.object({
  includeDeleted: Joi.string().valid('true', 'false').default('false'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
}).unknown(true)

module.exports = { createQualificationSchema, createQualificationDualSchema, updateQualificationSchema, listQualificationQuerySchema }
