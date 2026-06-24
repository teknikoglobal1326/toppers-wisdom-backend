const Joi = require('joi')

const createExamSchema = Joi.object({
  name:             Joi.string().trim().required(),
  subexamCount:     Joi.number().integer().min(0).default(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  status:           Joi.string().valid('active', 'inactive').default('active'),
})

const updateExamSchema = Joi.object({
  name:             Joi.string().trim(),
  subexamCount:     Joi.number().integer().min(0),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  status:           Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createExamSchema, updateExamSchema }
