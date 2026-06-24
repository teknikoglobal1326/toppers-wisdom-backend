const Joi = require('joi')

const reportSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
})

module.exports = { reportSchema }
