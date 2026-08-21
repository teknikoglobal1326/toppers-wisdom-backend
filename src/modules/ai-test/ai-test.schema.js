const Joi = require('joi')

const objectId = Joi.string().hex().length(24)

const generateAiTestSchema = Joi.object({
  name: Joi.string().trim().max(100).optional().allow(null, ''),
  subjectIds: Joi.array().items(objectId.required()).min(1).required(),
  chapterIds: Joi.array().items(objectId.required()).optional().default([]),
  topicIds: Joi.array().items(objectId.required()).optional().default([]),
  totalQuestions: Joi.number().integer().min(1).max(100).required(),
  duration: Joi.number().integer().min(1).max(300).required(), // in minutes
})

const updateSessionSchema = Joi.object({
  answer: Joi.object({
    questionId: objectId.required(),
    selectedOption: Joi.number().integer().min(0).max(3).allow(null),
    status: Joi.string().valid('answered', 'skipped', 'visited', 'unattempted'),
    timeTaken: Joi.number().min(0),
  }),
  answers: Joi.array().items(Joi.object({
    questionId: objectId.required(),
    selectedOption: Joi.number().integer().min(0).max(3).allow(null),
    status: Joi.string().valid('answered', 'skipped', 'visited', 'unattempted'),
    timeTaken: Joi.number().min(0),
  })),
  status: Joi.string().valid('ongoing', 'completed', 'abandoned'),
  timeTaken: Joi.number().min(0).optional(),
}).or('answer', 'answers', 'status')

module.exports = {
  generateAiTestSchema,
  updateSessionSchema,
}
