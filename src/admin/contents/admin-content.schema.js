const Joi = require('joi')

const createContentSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  topic: Joi.string().hex().length(24).required(),
  topicId: Joi.string().hex().length(24).optional(),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().optional().allow('', null),
  video: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateContentSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  topic: Joi.string().hex().length(24).optional(),
  topicId: Joi.string().hex().length(24).optional(),
  title: Joi.string().trim(),
  description: Joi.string().trim().optional().allow('', null),
  video: Joi.string().trim(),
  image: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createContentSchema, updateContentSchema }
