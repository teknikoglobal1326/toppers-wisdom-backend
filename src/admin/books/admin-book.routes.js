const router = require('express').Router()
const controller = require('./admin-book.controller')
const { validate, validateQuery } = require('../../core/validate')
const { isDualLanguagePayload } = require('../../core/languageUtils')
const { createBookSchema, createBookDualSchema, updateBookSchema, setBuyUrlSchema, listBookQuerySchema } = require('./admin-book.schema')
const { uploadBookFiles, parseFields, parseFiles } = require('./admin-book.upload')

const validateCreate = (req, res, next) => {
  const schema = isDualLanguagePayload(req.body) ? createBookDualSchema : createBookSchema
  return validate(schema)(req, res, next)
}

router.get('/', validateQuery(listBookQuerySchema), controller.list)
router.post('/', uploadBookFiles, parseFields, validateCreate, parseFiles, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadBookFiles, parseFields, validate(updateBookSchema), parseFiles, controller.update)
router.delete('/:id', controller.remove)
router.patch('/:id/buy-url', validate(setBuyUrlSchema), controller.setBuyUrl)

module.exports = router
