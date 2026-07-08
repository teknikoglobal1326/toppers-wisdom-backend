const router = require('express').Router()
const controller = require('./admin-test-series-test.controller')
const { validate } = require('../../core/validate')
const { createTestSeriesTestSchema, updateTestSeriesTestSchema } = require('./admin-test-series-test.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/', uploadThumbnail, parseThumbnail('test-series-tests/thumbnails'), validate(createTestSeriesTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('test-series-tests/thumbnails'), validate(updateTestSeriesTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
