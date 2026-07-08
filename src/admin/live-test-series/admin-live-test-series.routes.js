const router = require('express').Router()
const controller = require('./admin-live-test-series.controller')
const { validate } = require('../../core/validate')
const { createLiveTestSeriesSchema, updateLiveTestSeriesSchema } = require('./admin-live-test-series.schema')

router.get('/', controller.list)
router.post('/', validate(createLiveTestSeriesSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateLiveTestSeriesSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
