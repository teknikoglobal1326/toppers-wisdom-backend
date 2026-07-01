const Joi = require('joi')

const createBlogSchema = Joi.object({
  title: Joi.string().min(3).max(200).required(),
  image: Joi.string().max(500).allow('', null),
  shortDescription: Joi.string().max(500).allow('', null),
  longDescription: Joi.string().max(20000).required(),
  category: Joi.string().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().max(50)).default([]),
  status: Joi.string().valid('draft', 'published').default('draft'),
})

const updateBlogSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  image: Joi.string().max(500).allow('', null),
  shortDescription: Joi.string().max(500).allow('', null),
  longDescription: Joi.string().max(20000),
  category: Joi.string().max(100).allow('', null),
  tags: Joi.array().items(Joi.string().max(50)),
  status: Joi.string().valid('draft', 'published'),
}).min(1).messages({ 'object.min': 'At least one field is required to update' })

module.exports = { createBlogSchema, updateBlogSchema }
