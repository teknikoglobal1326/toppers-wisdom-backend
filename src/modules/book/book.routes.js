const router     = require('express').Router()
const controller = require('./book.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listBooksSchema } = require('./book.schema')

router.get('/', validateQuery(listBooksSchema), controller.listBooks)
router.get('/:id', controller.getBook)

module.exports = router
