const router = require('express').Router()
const controller = require('./admin-vocabulary.controller')
const { validate, validateQuery } = require('../../core/validate')
const { uploadVocabularyImages, parseFormData } = require('./admin-vocabulary.upload')
const { createVocabularySchema, updateVocabularySchema, listVocabularyQuerySchema } = require('./admin-vocabulary.schema')

router.get('/', validateQuery(listVocabularyQuerySchema), controller.list)
router.post('/', uploadVocabularyImages, parseFormData, validate(createVocabularySchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadVocabularyImages, parseFormData, validate(updateVocabularySchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router