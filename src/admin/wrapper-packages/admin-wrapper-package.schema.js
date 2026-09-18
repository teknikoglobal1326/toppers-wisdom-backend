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
  type: Joi.string().valid('recorded', 'live', 'free').default('recorded'),
  isFree: Joi.alternatives().try(Joi.boolean(), Joi.string()).default(false),
  mrp: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active')
}).unknown(true)

const updateWrapperPackageSchema = Joi.object({
  exam: objectId.optional(),
  courses: Joi.alternatives().try(
    Joi.array().items(objectId).min(1),
    Joi.string()
  ),
  title: Joi.string().trim(),
  description: Joi.string().trim().optional().allow(null, ''),
  type: Joi.string().valid('recorded', 'live', 'free'),
  isFree: Joi.alternatives().try(Joi.boolean(), Joi.string()),
  mrp: Joi.number().min(0),
  price: Joi.number().min(0),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive')
}).min(1).unknown(true)

const listWrapperPackageQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'all'),
  type: Joi.string().valid('recorded', 'live', 'free', 'all'),
  exam: objectId.optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().optional().allow('', null),
  sortBy: Joi.string().default('sortOrder'),
  sortOrder: Joi.number().valid(1, -1).default(1)
}).unknown(true)

module.exports = { 
  createWrapperPackageSchema, 
  updateWrapperPackageSchema, 
  listWrapperPackageQuerySchema 
}
