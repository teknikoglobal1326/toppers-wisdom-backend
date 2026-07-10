const router = require('express').Router()
const controller = require('./admin-editorial-test.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createEditorialTestSchema, updateEditorialTestSchema, listEditorialTestQuerySchema } = require('./admin-editorial-test.schema')
const { uploadEditorialTestMedia, parseFormData } = require('./admin-editorial-test.upload')

router.get('/', validateQuery(listEditorialTestQuerySchema), controller.list)
router.post('/', uploadEditorialTestMedia, parseFormData, validate(createEditorialTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadEditorialTestMedia, parseFormData, validate(updateEditorialTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router