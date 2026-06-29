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

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string().email().trim().optional().allow(null, ''),
  qualification: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(), // MongoDB ObjectId
  language: Joi.string().valid('hi', 'en').required(),
})

module.exports = { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, updatePasswordSchema, updateProfileSchema }