const Joi = require('joi')

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
})

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
})

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
})

const resetPasswordSchema = Joi.object({
  token:       Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
})

module.exports = { loginSchema, refreshTokenSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema }


