const router = require('express').Router()
const controller = require('./admin-editorial-question.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createEditorialQuestionSchema, updateEditorialQuestionSchema, listEditorialQuestionQuerySchema } = require('./admin-editorial-question.schema')
const { uploadEditorialQuestionImages, parseFormData } = require('./admin-editorial-question.upload')

router.get('/', validateQuery(listEditorialQuestionQuerySchema), controller.list)
router.post('/', uploadEditorialQuestionImages, parseFormData, validate(createEditorialQuestionSchema), controller.create)
router.get('/:id', validateQuery(listEditorialQuestionQuerySchema), controller.getOne)
router.put('/:id', uploadEditorialQuestionImages, parseFormData, validate(updateEditorialQuestionSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router