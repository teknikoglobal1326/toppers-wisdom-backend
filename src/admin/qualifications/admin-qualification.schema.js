const Joi = require('joi')

const createQualificationSchema = Joi.object({
  name:      Joi.string().trim().required(),
  isActive:  Joi.boolean().default(true),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const updateQualificationSchema = Joi.object({
  name:      Joi.string().trim(),
  isActive:  Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
}).min(1)

module.exports = { createQualificationSchema, updateQualificationSchema }
