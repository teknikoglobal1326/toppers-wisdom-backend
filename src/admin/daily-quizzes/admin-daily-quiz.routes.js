const router = require('express').Router()
const controller = require('./admin-daily-quiz.controller')
const { validate } = require('../../core/validate')
const { createDailyQuizSchema, updateDailyQuizSchema } = require('./admin-daily-quiz.schema')
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
router.post('/', uploadThumbnail, parseThumbnail('daily-quizzes/thumbnails'), validate(createDailyQuizSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', uploadThumbnail, parseThumbnail('daily-quizzes/thumbnails'), validate(updateDailyQuizSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
