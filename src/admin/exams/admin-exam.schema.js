const Joi = require('joi')

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
})

const createExamSchema = Joi.object({
  qualification:    objectId.required().label('qualification'),
  name:             Joi.string().trim().required(),
  sortOrder:        Joi.number().integer().min(0).default(0),
  subexamCount:     Joi.number().integer().min(0).default(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  language:         Joi.string().valid('hi', 'en', 'both').default('both'),
  status:           Joi.string().valid('active', 'inactive').default('active'),
})

const updateExamSchema = Joi.object({
  qualification:    objectId.label('qualification'),
  name:             Joi.string().trim(),
<<<<<<< HEAD
  hiName:           Joi.string().trim().allow('', null).optional(),
  enName:           Joi.string().trim().allow('', null).optional(),
=======
  sortOrder:        Joi.number().integer().min(0),
>>>>>>> ec730d2e0b3b73d0bc209bafd3359ae53915769c
  subexamCount:     Joi.number().integer().min(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  language:         Joi.string().valid('hi', 'en', 'both'),
  status:           Joi.string().valid('active', 'inactive'),
}).min(1)

const createExamDualSchema = Joi.object({
  hi: createExamSchema.required(),
  en: createExamSchema.required(),
})

const listExamQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  language: Joi.string().valid('hi', 'en', 'both'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createExamSchema, createExamDualSchema, updateExamSchema, listExamQuerySchema }
