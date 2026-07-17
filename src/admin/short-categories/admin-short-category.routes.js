const router = require('express').Router()
const controller = require('./admin-short-category.controller')
const { validate, validateQuery } = require('../../core/validate')
const { uploadShortCategoryFiles, parseFormData } = require('./admin-short-category.upload')
const { createShortCategorySchema, updateShortCategorySchema, listShortCategoryQuerySchema } = require('./admin-short-category.schema')

router.get('/', validateQuery(listShortCategoryQuerySchema), controller.list)
router.post('/', uploadShortCategoryFiles, parseFormData, validate(createShortCategorySchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadShortCategoryFiles, parseFormData, validate(updateShortCategorySchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
