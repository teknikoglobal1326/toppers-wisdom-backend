const Joi = require('joi')

const broadcastSchema = Joi.object({
  title:     Joi.string().required(),
  body:      Joi.string().required(),
  subExamId: Joi.string(),
  all:       Joi.boolean().default(false),
  type:      Joi.string().valid('course', 'test', 'payment', 'system').default('system'),
})

module.exports = { broadcastSchema }
