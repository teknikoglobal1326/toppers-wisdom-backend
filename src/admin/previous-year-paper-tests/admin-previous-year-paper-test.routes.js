const router = require('express').Router()
const controller = require('./admin-previous-year-paper-test.controller')
const { validate } = require('../../core/validate')
const { createPreviousYearPaperTestSchema, updatePreviousYearPaperTestSchema } = require('./admin-previous-year-paper-test.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.get('/metadata/options', controller.metadata)
router.post('/', uploadThumbnail, parseThumbnail('previous-year-paper-tests/thumbnails'), validate(createPreviousYearPaperTestSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('previous-year-paper-tests/thumbnails'), validate(updatePreviousYearPaperTestSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
