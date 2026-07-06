const Joi = require('joi')

const createQualificationSchema = Joi.object({
  name:      Joi.string().trim().required(),
  hiName:    Joi.string().trim().allow('', null).optional(),
  enName:    Joi.string().trim().allow('', null).optional(),
  language:  Joi.string().valid('hi', 'en', 'both').default('both'),
  isActive:  Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const updateQualificationSchema = Joi.object({
  name:      Joi.string().trim(),
  hiName:    Joi.string().trim().allow('', null).optional(),
  enName:    Joi.string().trim().allow('', null).optional(),
  language:  Joi.string().valid('hi', 'en', 'both'),
  isActive:  Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).min(1)

const createQualificationDualSchema = Joi.object({
  hi: createQualificationSchema.required(),
  en: createQualificationSchema.required(),
})

module.exports = { createQualificationSchema, createQualificationDualSchema, updateQualificationSchema }
