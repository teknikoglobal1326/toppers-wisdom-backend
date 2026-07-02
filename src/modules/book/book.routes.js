const router = require('express').Router()
const controller = require('./book.controller')
const { authMiddleware } = require('../../middlewares/auth.middleware')
const { validate, validateQuery } = require('../../core/validate')
const { listBooksSchema } = require('./book.schema')

router.get('/my', authMiddleware, validateQuery(listBooksSchema), controller.listUserBooks)
router.get('/', validateQuery(listBooksSchema), controller.listBooks)
router.get('/:id', controller.getBook)

module.exports = router
