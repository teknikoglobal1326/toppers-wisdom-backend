const router = require('express').Router()
const controller = require('./admin-math.controller')
const { validate } = require('../../core/validate')
const { createMathSchema, updateMathSchema } = require('./admin-math.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/seed-test-data', controller.seedTestData)
router.post('/', uploadThumbnail, parseThumbnail('math/thumbnails'), validate(createMathSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('math/thumbnails'), validate(updateMathSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
