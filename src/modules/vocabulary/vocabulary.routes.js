const router = require('express').Router()
const controller = require('./vocabulary.controller')
const { validate, validateQuery } = require('../../core/validate')
const { listVocabularyQuerySchema, setBookmarkSchema } = require('./vocabulary.schema')

router.get('/', validateQuery(listVocabularyQuerySchema), controller.list)
router.patch('/read/:id', controller.markRead)
router.patch('/bookmark/:id', validate(setBookmarkSchema), controller.setBookmark)
router.get('/:id', controller.getOne)

module.exports = router