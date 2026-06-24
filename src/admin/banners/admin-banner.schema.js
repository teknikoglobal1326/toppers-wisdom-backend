const Joi = require('joi')

const createBannerSchema = Joi.object({
  name: Joi.string().trim().required(),
  image: Joi.string().uri().optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateBannerSchema = Joi.object({
  name: Joi.string().trim(),
  image: Joi.string().uri().optional().allow(null, ''),
  examId: Joi.string().hex().length(24).optional().allow(null, ''),
  subexamId: Joi.string().hex().length(24).optional().allow(null, ''),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createBannerSchema, updateBannerSchema }