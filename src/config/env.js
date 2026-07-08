const Joi = require('joi')
require('dotenv').config()

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  MONGODB_URI: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ADMIN_SECRET: Joi.string().min(32).required(),
  MSG91_AUTH_KEY: Joi.string().required(),
  MSG91_TEMPLATE_ID: Joi.string().required(),
  AWS_ACCESS_KEY_ID: Joi.string().optional().allow(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_S3_BUCKET: Joi.string().optional().allow(''),
  RAZORPAY_KEY_ID: Joi.string().required(),
  RAZORPAY_KEY_SECRET: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().optional().allow(''),
  FCM_SERVICE_ACCOUNT_JSON: Joi.string().optional().allow(''),
  ADMIN_PHONE: Joi.string().required(),
  ALLOWED_ORIGINS: Joi.string().default('http://localhost:3001'),
}).unknown()

const { error, value } = schema.validate(process.env)
if (error) throw new Error(`Config validation error: ${error.message}`)

module.exports = Object.freeze(value)