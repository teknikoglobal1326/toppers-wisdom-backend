const router = require('express').Router()
const controller = require('./grammar.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listGrammarQuerySchema, setGrammarChapterLikeSchema, setGrammarChapterReadSchema, setGrammarChapterBookmarkSchema } = require('./grammar.schema')

router.get('/', validateQuery(listGrammarQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.patch('/read/:id/:chapterId', validate(setGrammarChapterReadSchema), controller.setChapterRead)
router.patch('/bookmark/:id/:chapterId', validate(setGrammarChapterBookmarkSchema), controller.setChapterBookmark)
router.patch('/like/:id/:chapterId', validate(setGrammarChapterLikeSchema), controller.setChapterLike)

module.exports = router
