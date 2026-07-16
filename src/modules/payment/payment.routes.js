const router     = require('express').Router()
const controller = require('./payment.controller')
const { validate, validateQuery } = require('../../core/validate')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { createOrderSchema, verifyPaymentSchema, listTransactionsQuerySchema } = require('./payment.schema')

// Webhook is unauthenticated — Razorpay calls this directly
router.post('/webhook', controller.webhook)

// All other payment routes require auth
router.use(authMiddleware)
router.post('/create-order', validate(createOrderSchema),  controller.createOrder)
router.post('/verify',       validate(verifyPaymentSchema), controller.verifyPayment)
router.get('/transactions',  validateQuery(listTransactionsQuerySchema), controller.listMyTransactions)

module.exports = router
