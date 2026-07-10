const router = require('express').Router()
const controller = require('./vocabulary.controller')
const { validateQuery } = require('../../core/validate')
const { listVocabularyQuerySchema } = require('./vocabulary.schema')

router.get('/', validateQuery(listVocabularyQuerySchema), controller.list)
router.get('/:id', controller.getOne)

module.exports = router