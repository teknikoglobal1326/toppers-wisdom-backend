const Joi = require('joi')

const createFaqSchema = Joi.object({
  question: Joi.string().trim().required(),
  answer: Joi.string().trim().required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateFaqSchema = Joi.object({
  question: Joi.string().trim(),
  answer: Joi.string().trim(),
  sortOrder: Joi.number().integer().min(0),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

const listFaqQuerySchema = Joi.object({
  status: Joi.string().valid('active', 'inactive'),
  question: Joi.string().trim().max(300),
  search: Joi.string().trim().max(300),
  sortBy: Joi.string().valid('sortOrder', 'question', 'status', 'createdAt', 'updatedAt').default('sortOrder'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
}).unknown(true)

module.exports = { createFaqSchema, updateFaqSchema, listFaqQuerySchema }
