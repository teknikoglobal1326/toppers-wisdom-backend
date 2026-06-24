const Joi = require('joi')

const createShortSchema = Joi.object({
  title:     Joi.string().trim().required(),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive').default('active'),
  thumbnail: Joi.string().uri().optional().allow(null, ''),
})

const updateShortSchema = Joi.object({
  title:     Joi.string().trim(),
  examId:    Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status:    Joi.string().valid('active', 'inactive'),
  thumbnail: Joi.string().uri().optional().allow(null, ''),
}).min(1)

module.exports = { createShortSchema, updateShortSchema }
