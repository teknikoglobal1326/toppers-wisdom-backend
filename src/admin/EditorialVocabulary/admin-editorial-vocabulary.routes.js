const router = require('express').Router()
const controller = require('./admin-editorial-vocabulary.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createVocabSchema, updateVocabSchema, listVocabQuerySchema } = require('./admin-editorial-vocabulary.schema')
const { uploadVocabularyMedia, parseFormData } = require('./admin-editorial-vocabulary.upload')

router.get('/', validateQuery(listVocabQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', uploadVocabularyMedia, parseFormData, validate(createVocabSchema), controller.create)
router.patch('/:id', uploadVocabularyMedia, parseFormData, validate(updateVocabSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
