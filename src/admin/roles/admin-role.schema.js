const Joi = require('joi')

const createRoleSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  permissions: Joi.array().items(Joi.string().hex().length(24)).default([]),
  sortOrder: Joi.number().integer().min(0).default(0),
  profileImage: Joi.string().trim().allow('', null),
  isActive: Joi.boolean().default(true),
})

const updateRoleSchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  permissions: Joi.array().items(Joi.string().hex().length(24)),
  sortOrder: Joi.number().integer().min(0),
  profileImage: Joi.string().trim().allow('', null),
  isActive: Joi.boolean(),
}).min(1)

const listRoleQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  isActive: Joi.boolean(),
})

module.exports = { createRoleSchema, updateRoleSchema, listRoleQuerySchema }
