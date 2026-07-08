const router = require('express').Router()
const controller = require('./admin-editorial.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createEditorialSchema, updateEditorialSchema, listEditorialQuerySchema } = require('./admin-editorial.schema')
const { uploadEditorialMedia, parseFormData } = require('./admin-editorial.upload')

router.get('/', validateQuery(listEditorialQuerySchema), controller.list)
router.post('/', uploadEditorialMedia, parseFormData, validate(createEditorialSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadEditorialMedia, parseFormData, validate(updateEditorialSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router