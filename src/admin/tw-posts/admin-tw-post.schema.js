const Joi = require('joi')

const createTWPostSchema = Joi.object({
  type: Joi.string().valid('image', 'text').required(),
  title: Joi.string().trim().required(),
  shortDescription: Joi.string().trim().optional().allow('', null),
  image: Joi.string().optional().allow('', null),
  textContent: Joi.string().optional().allow('', null),
  color: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const updateTWPostSchema = Joi.object({
  type: Joi.string().valid('image', 'text').optional(),
  title: Joi.string().trim().optional(),
  shortDescription: Joi.string().trim().optional().allow('', null),
  image: Joi.string().optional().allow('', null),
  textContent: Joi.string().optional().allow('', null),
  color: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
}).min(1)

const listTWPostQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive').optional(),
  type: Joi.string().valid('image', 'text').optional(),
  search: Joi.string().trim().max(200).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createTWPostSchema, updateTWPostSchema, listTWPostQuerySchema }
