const Joi = require('joi')

const createSubExamSchema = Joi.object({
  name:             Joi.string().trim().required(),
  hiName:           Joi.string().trim().allow('', null).optional(),
  enName:           Joi.string().trim().allow('', null).optional(),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  sortOrder:        Joi.number().integer().min(0).default(0),
  examId:           Joi.string().hex().length(24).required(),
  language:         Joi.string().valid('hi', 'en', 'both').default('both'),
  status:           Joi.string().valid('active', 'inactive').default('active'),
})

const updateSubExamSchema = Joi.object({
  name:             Joi.string().trim(),
  hiName:           Joi.string().trim().allow('', null).optional(),
  enName:           Joi.string().trim().allow('', null).optional(),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  sortOrder:        Joi.number().integer().min(0),
  examId:           Joi.string().hex().length(24),
  language:         Joi.string().valid('hi', 'en', 'both'),
  status:           Joi.string().valid('active', 'inactive'),
}).min(1)

const createSubExamDualSchema = Joi.object({
  hi: createSubExamSchema.required(),
  en: createSubExamSchema.required(),
})

const listSubExamQuerySchema = Joi.object({
  examId: Joi.string().hex().length(24),
  status: Joi.string().valid('active', 'inactive'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createSubExamSchema, createSubExamDualSchema, updateSubExamSchema, listSubExamQuerySchema }
