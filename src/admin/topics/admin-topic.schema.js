const Joi = require('joi')

const chapterSchema = Joi.object({
  title: Joi.string().trim().required(),
})

const createTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).required(),
  courseId: Joi.string().hex().length(24).optional(),
  topicName: Joi.string().trim().required(),
  chapters: Joi.array().items(chapterSchema).optional(),
  status: Joi.string().valid('active', 'inactive').default('active'),
})

const updateTopicSchema = Joi.object({
  course: Joi.string().hex().length(24).optional(),
  courseId: Joi.string().hex().length(24).optional(),
  topicName: Joi.string().trim(),
  chapters: Joi.array().items(chapterSchema),
  status: Joi.string().valid('active', 'inactive'),
}).min(1)

module.exports = { createTopicSchema, updateTopicSchema }
