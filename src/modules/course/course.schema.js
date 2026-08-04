const Joi = require('joi')

const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(5).max(1000).required(),
})

const noteSchema = Joi.object({
  title: Joi.string().trim().allow('').optional().default(''),
  text: Joi.string().trim().allow('').optional().default(''),
  image: Joi.string().trim().allow('', null).optional(),
  audio: Joi.string().trim().allow('', null).optional(),
  videoTimestamp: Joi.number().min(0).optional().default(0)
})

module.exports = { reviewSchema, noteSchema }
