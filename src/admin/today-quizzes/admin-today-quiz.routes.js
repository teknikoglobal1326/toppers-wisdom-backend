const router = require('express').Router()
const controller = require('./admin-today-quiz.controller')
const { validate } = require('../../core/validate')
const { createTodayQuizSchema, updateTodayQuizSchema } = require('./admin-today-quiz.schema')
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
router.post('/bulk', uploadBulkFields, controller.bulkCreate)
router.post('/', uploadThumbnail, parseThumbnail('today-quizzes/thumbnails'), validate(createTodayQuizSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('today-quizzes/thumbnails'), validate(updateTodayQuizSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
