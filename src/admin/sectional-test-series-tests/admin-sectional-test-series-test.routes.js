const router = require('express').Router()
const controller = require('./admin-sectional-test-series-test.controller')
const { validate } = require('../../core/validate')
const { createSectionalTestSeriesTestSchema, updateSectionalTestSeriesTestSchema } = require('./admin-sectional-test-series-test.schema')
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
router.get('/metadata', controller.metadata)
router.post('/bulk', uploadBulkFields, controller.bulkCreate)
router.post('/', uploadThumbnail, parseThumbnail('sectional-test-series-tests/thumbnails'), validate(createSectionalTestSeriesTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('sectional-test-series-tests/thumbnails'), validate(updateSectionalTestSeriesTestSchema), controller.update)
router.delete('/:id', controller.remove)
router.get('/:id/analytics', controller.getTestAnalytics)

module.exports = router
