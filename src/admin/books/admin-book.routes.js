const router = require('express').Router()
const controller = require('./admin-book.controller')
const { validate } = require('../../core/validate')
const { createBookSchema, updateBookSchema, setBuyUrlSchema } = require('./admin-book.schema')

router.get('/', controller.list)
router.post('/', validate(createBookSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateBookSchema), controller.update)
router.delete('/:id', controller.remove)
router.patch('/:id/buy-url', validate(setBuyUrlSchema), controller.setBuyUrl)

module.exports = router
