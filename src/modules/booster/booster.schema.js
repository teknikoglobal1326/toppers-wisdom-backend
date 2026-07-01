const Joi = require('joi')

const boosterQuerySchema = Joi.object({
  exam:    Joi.string(),
  subExam: Joi.string(),
  type:    Joi.string().valid('vocabulary', 'editorial', 'grammar', 'math'),
  page:    Joi.number().integer().min(1),
  limit:   Joi.number().integer().min(1).max(100),
})

module.exports = { boosterQuerySchema }
