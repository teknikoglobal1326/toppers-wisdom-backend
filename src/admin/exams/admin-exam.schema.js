const Joi = require('joi')

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
})

const createExamSchema = Joi.object({
  qualification:    objectId.required().label('qualification'),
  name:             Joi.string().trim().required(),
  subexamCount:     Joi.number().integer().min(0).default(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  language:         Joi.string().valid('hi', 'en', 'both').default('both'),
  status:           Joi.string().valid('active', 'inactive').default('active'),
})

const updateExamSchema = Joi.object({
  qualification:    objectId.label('qualification'),
  name:             Joi.string().trim(),
  subexamCount:     Joi.number().integer().min(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  language:         Joi.string().valid('hi', 'en', 'both'),
  status:           Joi.string().valid('active', 'inactive'),
}).min(1)

const createExamDualSchema = Joi.object({
  hi: createExamSchema.required(),
  en: createExamSchema.required(),
})

module.exports = { createExamSchema, createExamDualSchema, updateExamSchema }
