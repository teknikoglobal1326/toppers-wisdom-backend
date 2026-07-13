const Joi = require('joi')

const createPermissionSchema = Joi.object({
  module: Joi.string().trim().required(),
  action: Joi.string().trim().required(),
  key: Joi.string().trim().required(),
  description: Joi.string().trim().allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
  isActive: Joi.boolean().default(true),
})

const updatePermissionSchema = Joi.object({
  module: Joi.string().trim(),
  action: Joi.string().trim(),
  key: Joi.string().trim(),
  description: Joi.string().trim().allow('', null),
  sortOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean(),
}).min(1)

const listPermissionQuerySchema = Joi.object({
  search: Joi.string().trim().max(200),
  isActive: Joi.boolean(),
})

module.exports = { createPermissionSchema, updatePermissionSchema, listPermissionQuerySchema }
