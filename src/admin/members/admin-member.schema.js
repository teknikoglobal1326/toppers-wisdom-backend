const Joi = require('joi')

const createMemberSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  phone: Joi.number().allow(null),
  password: Joi.string().min(8).required(),
  role: Joi.string().hex().length(24).required(),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
})

const updateMemberSchema = Joi.object({
  name: Joi.string().trim(),
  email: Joi.string().email(),
  phone: Joi.number().allow(null),
  password: Joi.string().min(8),
  role: Joi.string().hex().length(24),
  sortOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1)

const listMemberQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  role: Joi.string().hex().length(24),
  isActive: Joi.boolean(),
  sortBy: Joi.string().valid('sortOrder', 'name', 'createdAt').optional(),
  order: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
})

module.exports = { createMemberSchema, updateMemberSchema, listMemberQuerySchema }
