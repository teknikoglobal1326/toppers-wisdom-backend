const router = require('express').Router()
const controller = require('./admin-quiz-series.controller')
const { validate } = require('../../core/validate')
const { createQuizSeriesSchema, updateQuizSeriesSchema } = require('./admin-quiz-series.schema')

router.get('/', controller.list)
router.post('/', validate(createQuizSeriesSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateQuizSeriesSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
