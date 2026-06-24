const Joi = require('joi')

const updateProfileSchema = Joi.object({
  name:     Joi.string().min(2).max(100),
  email:    Joi.string().email(),
  language: Joi.string().valid('hi', 'en'),
  avatar:   Joi.string().uri(),
})

const setupProfileSchema = Joi.object({
  name:            Joi.string().min(2).max(100).required(),
  email:           Joi.string().email().required(),
  qualificationId: Joi.string().required(),
  examTypeId:      Joi.string().required(),
  subExamId:       Joi.string().required(),
  language:        Joi.string().valid('hi', 'en').default('hi'),
})

const updateFcmSchema = Joi.object({
  fcmToken: Joi.string().required(),
})

module.exports = { updateProfileSchema, setupProfileSchema, updateFcmSchema }
