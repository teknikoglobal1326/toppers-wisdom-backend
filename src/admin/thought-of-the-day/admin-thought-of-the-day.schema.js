const Joi = require('joi')

const createThoughtSchema = Joi.object({
  quote:       Joi.string().trim().required(),
  authorName:  Joi.string().trim().required(),
  designation: Joi.string().trim().optional().allow('', null),
  authorImage: Joi.string().optional().allow('', null),
  publishDate: Joi.date().iso().required(),
  color:       Joi.string().trim().optional().allow('', null),
  status:      Joi.string().valid('active', 'inactive').default('active'),
  sortOrder:   Joi.number().integer().min(0).default(0),
})

const updateThoughtSchema = Joi.object({
  quote:       Joi.string().trim().optional(),
  authorName:  Joi.string().trim().optional(),
  designation: Joi.string().trim().optional().allow('', null),
  authorImage: Joi.string().optional().allow('', null),
  publishDate: Joi.date().iso().optional(),
  color:       Joi.string().trim().optional().allow('', null),
  status:      Joi.string().valid('active', 'inactive').optional(),
  sortOrder:   Joi.number().integer().min(0).optional(),
}).min(1)

const listThoughtQuerySchema = Joi.object({
  status:    Joi.string().valid('active', 'inactive').optional(),
  search:    Joi.string().trim().max(200).optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
})

module.exports = { createThoughtSchema, updateThoughtSchema, listThoughtQuerySchema }
