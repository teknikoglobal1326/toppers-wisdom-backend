const router = require('express').Router()
const controller = require('./editorial-vocabulary.controller')
const { validateQuery } = require('../../core/validate')
const { listVocabQuerySchema } = require('./editorial-vocabulary.schema')

router.get('/', validateQuery(listVocabQuerySchema), controller.list)
router.get('/:id', controller.getOne)

module.exports = router
