const router = require('express').Router()
const controller = require('./admin-previous-year-paper-test.controller')
const { validate } = require('../../core/validate')
const { createPreviousYearPaperTestSchema, updatePreviousYearPaperTestSchema } = require('./admin-previous-year-paper-test.schema')
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
router.post('/', uploadThumbnail, parseThumbnail('previous-year-paper-tests/thumbnails'), validate(createPreviousYearPaperTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('previous-year-paper-tests/thumbnails'), validate(updatePreviousYearPaperTestSchema), controller.update)
router.get('/:id/section-timings', controller.getSectionTimings)
router.put('/:id/section-timings', controller.updateSectionTimings)
router.delete('/:id', controller.remove)

module.exports = router
