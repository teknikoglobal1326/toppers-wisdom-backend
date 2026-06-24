const Joi = require('joi')

const updateLessonSchema = Joi.object({
  lessonId:       Joi.string().required(),
  courseId:       Joi.string().required(),
  watchedSeconds: Joi.number().min(0).default(0),
  completed:      Joi.boolean().default(false),
})

module.exports = { updateLessonSchema }
