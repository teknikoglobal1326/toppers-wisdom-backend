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

const createReportSchema = Joi.object({
  itemType: Joi.string().valid('vocabulary', 'editorial').required(),
  itemId: Joi.string().hex().length(24).required(),
  description: Joi.string().trim().min(2).max(1000).required(),
})

module.exports = { updateProfileSchema, setupProfileSchema, updateFcmSchema, createReportSchema }
