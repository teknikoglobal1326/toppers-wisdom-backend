const router = require('express').Router()
const controller = require('./admin-live-test.controller')
const { validate } = require('../../core/validate')
const { createLiveTestSchema, updateLiveTestSchema } = require('./admin-live-test.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')
const multer = require('multer')

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})
const uploadBulkFields = uploadBulk.fields([
  { name: 'file', maxCount: 1 }
])

router.get('/', controller.list)
router.get('/metadata/options', controller.metadata)
router.post('/bulk', uploadBulkFields, controller.bulkCreate)
router.post('/', uploadThumbnail, parseThumbnail('live-tests/thumbnails'), validate(createLiveTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('live-tests/thumbnails'), validate(updateLiveTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
