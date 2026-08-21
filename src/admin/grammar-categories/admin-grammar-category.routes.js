const router = require('express').Router()
const controller = require('./admin-grammar-category.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createGrammarCategorySchema, updateGrammarCategorySchema, listGrammarCategoryQuerySchema } = require('./admin-grammar-category.schema')

router.get('/', validateQuery(listGrammarCategoryQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', validate(createGrammarCategorySchema), controller.create)
router.patch('/:id', validate(updateGrammarCategorySchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
