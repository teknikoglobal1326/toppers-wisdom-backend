const router = require('express').Router()
const controller = require('./admin-sectional-test-series.controller')
const { validate } = require('../../core/validate')
const { createSectionalTestSeriesSchema, updateSectionalTestSeriesSchema } = require('./admin-sectional-test-series.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/', uploadThumbnail, parseThumbnail('sectional-test-series/thumbnails'), validate(createSectionalTestSeriesSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('sectional-test-series/thumbnails'), validate(updateSectionalTestSeriesSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
