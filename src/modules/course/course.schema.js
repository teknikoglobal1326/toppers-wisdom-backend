const Joi = require('joi')

const reviewSchema = Joi.object({
  rating:  Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(5).max(1000).required(),
})

module.exports = { reviewSchema }
