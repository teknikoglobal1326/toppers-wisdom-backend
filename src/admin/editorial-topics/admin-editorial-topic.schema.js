const Joi = require('joi')

const createTopicSchema = Joi.object({
  name: Joi.string().trim().max(200).required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateTopicSchema = Joi.object({
  name: Joi.string().trim().max(200).optional(),
  sortOrder: Joi.number().integer().min(0).optional(),
  status: Joi.string().valid('active', 'inactive').optional(),
}).min(1)

const listTopicQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  search: Joi.string().trim().max(200),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createTopicSchema, updateTopicSchema, listTopicQuerySchema }
