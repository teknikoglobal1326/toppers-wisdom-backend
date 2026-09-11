const router = require('express').Router()
const controller = require('./book.controller')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { validate, validateQuery } = require('../../core/validate')
const { listBooksSchema } = require('./book.schema')
const express = require('express')

router.get('/my', authMiddleware, validateQuery(listBooksSchema), controller.listUserBooks)
router.get('/', validateQuery(listBooksSchema), controller.listBooks)

// Purchase flow routes
router.post('/webhook', express.json(), controller.webhook) // Webhook typically doesn't need authMiddleware, relies on signature
router.post('/:id/purchase', authMiddleware, controller.purchaseBook)
router.post('/verify', authMiddleware, controller.verifyPayment)
router.get('/user/purchased', authMiddleware, controller.listPurchasedBooks)
router.get('/user/transactions', authMiddleware, controller.listTransactions)

router.get('/:id', controller.getBook)

module.exports = router
