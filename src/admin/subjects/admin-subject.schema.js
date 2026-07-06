const Joi = require('joi')

const createSubjectSchema = Joi.object({
  name:     Joi.string().trim().required(),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status:   Joi.string().valid('active', 'inactive').default('active'),
})

const updateSubjectSchema = Joi.object({
  name:     Joi.string().trim(),
  language: Joi.string().valid('hi', 'en', 'both'),
  status:   Joi.string().valid('active', 'inactive'),
}).min(1)

const createSubjectDualSchema = Joi.object({
  hi: createSubjectSchema.required(),
  en: createSubjectSchema.required(),
})

module.exports = { createSubjectSchema, createSubjectDualSchema, updateSubjectSchema }
