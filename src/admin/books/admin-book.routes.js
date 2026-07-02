const router = require('express').Router()
const controller = require('./admin-book.controller')
const { validate } = require('../../core/validate')
const { createBookSchema, updateBookSchema, setBuyUrlSchema } = require('./admin-book.schema')
const { uploadBookFiles, parseFields, parseFiles } = require('./admin-book.upload')

router.get('/', controller.list)
router.post('/', uploadBookFiles, parseFields, validate(createBookSchema), parseFiles, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadBookFiles, parseFields, validate(updateBookSchema), parseFiles, controller.update)
router.delete('/:id', controller.remove)
router.patch('/:id/buy-url', validate(setBuyUrlSchema), controller.setBuyUrl)

module.exports = router
