const Joi = require('joi')

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
})

const createWrapperPackageSchema = Joi.object({
  exam: objectId.required(),
  courses: Joi.alternatives().try(
    Joi.array().items(objectId).min(1),
    Joi.string().required() // if sent as stringified JSON from form-data
  ).required(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().optional().allow(null, ''),
  price: Joi.number().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active')
})

const updateWrapperPackageSchema = Joi.object({
  exam: objectId.optional(),
  courses: Joi.alternatives().try(
    Joi.array().items(objectId).min(1),
    Joi.string()
  ),
  title: Joi.string().trim(),
  description: Joi.string().trim().optional().allow(null, ''),
  price: Joi.number().min(0),
  status: Joi.string().valid('active', 'inactive')
}).min(1)

const listWrapperPackageQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  exam: objectId.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional().allow('', null)
}).unknown(true)

module.exports = { 
  createWrapperPackageSchema, 
  updateWrapperPackageSchema, 
  listWrapperPackageQuerySchema 
}
