const Joi = require('joi')

const createOrderSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    itemType: Joi.string().valid('course', 'test', 'booster').required(),
    itemId:   Joi.string().required(),
    title:    Joi.string().required(),
    price:    Joi.number().min(0).required(),
  })).min(1).required(),
})

const verifyPaymentSchema = Joi.object({
  razorpayOrderId:   Joi.string().required(),
  razorpayPaymentId: Joi.string().required(),
  razorpaySignature: Joi.string().required(),
})

module.exports = { createOrderSchema, verifyPaymentSchema }
