const router = require('express').Router()
const controller = require('./grammar.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listGrammarQuerySchema, setGrammarChapterLikeSchema } = require('./grammar.schema')

router.get('/', validateQuery(listGrammarQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.patch('/like/:id/:chapterId', validate(setGrammarChapterLikeSchema), controller.setChapterLike)

module.exports = router
