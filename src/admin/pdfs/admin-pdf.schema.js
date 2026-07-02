const Joi = require('joi')

const createPdfSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  topic: Joi.string().hex().length(24).required(),
  topicId: Joi.string().hex().length(24).optional(),
  chapter: Joi.string().trim().optional().allow('', null),
  title: Joi.string().trim().required(),
  description: Joi.string().trim().optional().allow('', null),
  pdfFile: Joi.string().trim().required(),
  image: Joi.string().trim().optional().allow('', null),
  instruction: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updatePdfSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  topic: Joi.string().hex().length(24).optional(),
  topicId: Joi.string().hex().length(24).optional(),
  chapter: Joi.string().trim().optional().allow('', null),
  title: Joi.string().trim(),
  description: Joi.string().trim().optional().allow('', null),
  pdfFile: Joi.string().trim(),
  image: Joi.string().trim().optional().allow('', null),
  instruction: Joi.string().trim().optional().allow('', null),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createPdfSchema, updatePdfSchema }
