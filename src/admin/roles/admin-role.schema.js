const Joi = require('joi')

const createRoleSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  permissions: Joi.alternatives().try(
    Joi.object().unknown(true),
    Joi.array().items(Joi.any()),
    Joi.boolean(),
  ).default({}),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
})

const updateRoleSchema = Joi.object({
  name: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  permissions: Joi.alternatives().try(
    Joi.object().unknown(true),
    Joi.array().items(Joi.any()),
    Joi.boolean(),
  ),
  sortOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1)

const listRoleQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  isActive: Joi.boolean(),
})

module.exports = { createRoleSchema, updateRoleSchema, listRoleQuerySchema }
