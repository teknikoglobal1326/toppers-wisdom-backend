const router = require('express').Router()
const controller = require('./admin-live-test.controller')
const { validate } = require('../../core/validate')
const { createLiveTestSchema, updateLiveTestSchema } = require('./admin-live-test.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/', uploadThumbnail, parseThumbnail('live-tests/thumbnails'), validate(createLiveTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('live-tests/thumbnails'), validate(updateLiveTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
