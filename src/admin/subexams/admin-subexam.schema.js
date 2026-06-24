const Joi = require('joi')

const createSubExamSchema = Joi.object({
  name:             Joi.string().trim().required(),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  examId:           Joi.string().hex().length(24).required(),
  status:           Joi.string().valid('active', 'inactive').default('active'),
})

const updateSubExamSchema = Joi.object({
  name:             Joi.string().trim(),
  shortDescription: Joi.string().trim().optional().allow(null, ''),
  examId:           Joi.string().hex().length(24),
  status:           Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createSubExamSchema, updateSubExamSchema }
