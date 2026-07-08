const Joi = require('joi')

const createSubjectSchema = Joi.object({
  name:     Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status:   Joi.string().valid('active', 'inactive').default('active'),
})

const updateSubjectSchema = Joi.object({
  name:     Joi.string().trim(),
<<<<<<< HEAD
  hiName:   Joi.string().trim().allow('', null).optional(),
  enName:   Joi.string().trim().allow('', null).optional(),
=======
  sortOrder: Joi.number().integer().min(0),
>>>>>>> ec730d2e0b3b73d0bc209bafd3359ae53915769c
  language: Joi.string().valid('hi', 'en', 'both'),
  status:   Joi.string().valid('active', 'inactive'),
}).min(1)

const createSubjectDualSchema = Joi.object({
  hi: createSubjectSchema.required(),
  en: createSubjectSchema.required(),
})

const listSubjectQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createSubjectSchema, createSubjectDualSchema, updateSubjectSchema, listSubjectQuerySchema }
