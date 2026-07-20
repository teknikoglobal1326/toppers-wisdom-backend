const router = require('express').Router()
const controller = require('./admin-grammar.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createGrammarSchema, updateGrammarSchema, listGrammarQuerySchema } = require('./admin-grammar.schema')
const { uploadGrammarFiles, parseFormData } = require('./admin-grammar.upload')

router.get('/', validateQuery(listGrammarQuerySchema), controller.list)
router.post('/', uploadGrammarFiles, parseFormData, validate(createGrammarSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadGrammarFiles, parseFormData, validate(updateGrammarSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router

