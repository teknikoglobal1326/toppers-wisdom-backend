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

module.exports = { sendOtpSchema, verifyOtpSchema, refreshTokenSchema }