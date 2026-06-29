const Joi = require('joi')

const createSubjectSchema = Joi.object({
  name: Joi.string().trim().required(),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateSubjectSchema = Joi.object({
  name: Joi.string().trim(),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createSubjectSchema, updateSubjectSchema }
