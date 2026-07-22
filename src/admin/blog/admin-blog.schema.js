const Joi = require('joi')

const createBlogSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  hiTitle: Joi.string().trim().allow('', null).optional(),
  enTitle: Joi.string().trim().allow('', null).optional(),
  image: Joi.string().max(500).allow('', null),
  sortOrder: Joi.number().integer().min(0).default(0),
  shortDescription: Joi.string().max(500).allow('', null),
  hiShortDescription: Joi.string().max(500).allow('', null).optional(),
  longDescription: Joi.string().max(20000).required(),
  hiLongDescription: Joi.string().max(20000).allow('', null).optional(),
  category: Joi.string().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  language: Joi.string().valid('hi', 'en', 'both').default('both'),
  status: Joi.string().valid('draft', 'published').default('draft'),
})

const updateBlogSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  hiTitle: Joi.string().trim().allow('', null).optional(),
  enTitle: Joi.string().trim().allow('', null).optional(),
  image: Joi.string().max(500).allow('', null),
  sortOrder: Joi.number().integer().min(0),
  shortDescription: Joi.string().max(500).allow('', null),
  hiShortDescription: Joi.string().max(500).allow('', null).optional(),
  longDescription: Joi.string().max(20000),
  hiLongDescription: Joi.string().max(20000).allow('', null).optional(),
  category: Joi.string().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().max(50)),
  language: Joi.string().valid('hi', 'en', 'both'),
  status: Joi.string().valid('draft', 'published'),
}).min(1).messages({ 'object.min': 'At least one field is required to update' })

const createBlogDualSchema = Joi.object({
  hi: createBlogSchema.required(),
  en: createBlogSchema.required(),
})

const updateBlogDualSchema = Joi.object({
  hiId: Joi.string().hex().length(24).required(),
  enId: Joi.string().hex().length(24).required(),
  hi: updateBlogSchema.required(),
  en: updateBlogSchema.required(),
})

const listBlogQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'published'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
})

module.exports = { createBlogSchema, createBlogDualSchema, updateBlogSchema, updateBlogDualSchema, listBlogQuerySchema }
