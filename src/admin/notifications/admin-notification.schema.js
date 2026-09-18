const Joi = require('joi')

const broadcastSchema = Joi.object({
  title:           Joi.string().required(),
  body:            Joi.string().required(),
  targetAudience:  Joi.string().optional().allow('', null),
  examId:          Joi.string().optional().allow('', null),
  subExamId:       Joi.string().optional().allow('', null),
  courseIds:       Joi.array().items(Joi.string()).optional(),
  subscriptionIds: Joi.array().items(Joi.string()).optional(),
  all:             Joi.boolean().default(false),
  moduleType:      Joi.string().valid('course', 'test', 'subscription', 'test_series', 'live_test', 'previous_year_paper', 'live_classes', 'daily_quiz', 'book', 'editorial', 'system').default('system').optional().allow('', null),
  moduleId:        Joi.string().optional().allow('', null),
  countdown:       Joi.date().greater('now').optional().allow('', null),
  schedule:        Joi.date().greater('now').optional().allow('', null),
}).unknown(true)

module.exports = { broadcastSchema }