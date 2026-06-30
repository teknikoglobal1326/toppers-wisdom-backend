const Joi = require('joi')

const sendOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    .messages({ 'string.pattern.base': 'Provide a valid 10-digit Indian mobile number' }),
})

const verifyOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp: Joi.string().length(4).pattern(/^\d+$/).required(),
})

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

const updatePasswordSchema = Joi.object({
  password: Joi.string().min(6).required(),
})

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().optional(),
  email: Joi.string().email().trim().optional().allow(null, ''),
  qualification: objectId.optional().label('qualification'),
  language: Joi.string().valid('hi', 'en').optional(),
  examId: objectId.optional().label('examId'),
  subexamIds: Joi.array().items(objectId.label('subexamIds')).min(1).optional(),
  avatar: Joi.string().max(500).allow('', null).optional(),
}).min(1).messages({ 'object.min': 'At least one field is required to update' })

module.exports = { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, updatePasswordSchema, updateProfileSchema }