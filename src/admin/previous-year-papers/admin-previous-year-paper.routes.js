const router = require('express').Router()
const controller = require('./admin-previous-year-paper.controller')
const { validate } = require('../../core/validate')
const { createPreviousYearPaperSchema, updatePreviousYearPaperSchema } = require('./admin-previous-year-paper.schema')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/', controller.list)
router.post('/', uploadThumbnail, parseThumbnail('previous-year-papers/thumbnails'), validate(createPreviousYearPaperSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('previous-year-papers/thumbnails'), validate(updatePreviousYearPaperSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
