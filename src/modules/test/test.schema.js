const Joi = require('joi')

const submitSchema = Joi.object({
  answers: Joi.array().items(Joi.object({
    questionId:     Joi.string().required(),
    selectedOption: Joi.number().min(0).max(3).allow(null),
  })).required(),
  timeTaken: Joi.number().min(0).required(),
})

module.exports = { submitSchema }
