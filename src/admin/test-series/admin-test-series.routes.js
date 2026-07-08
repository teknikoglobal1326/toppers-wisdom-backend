const router = require('express').Router()
const controller = require('./admin-test-series.controller')
const { validate } = require('../../core/validate')
const { createTestSeriesSchema, updateTestSeriesSchema } = require('./admin-test-series.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/', uploadThumbnail, parseThumbnail('test-series/thumbnails'), validate(createTestSeriesSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('test-series/thumbnails'), validate(updateTestSeriesSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
