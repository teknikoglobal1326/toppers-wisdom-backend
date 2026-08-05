const router = require('express').Router()
const controller = require('./course.controller')
const { validate } = require('../../core/validate')
const { reviewSchema, noteSchema } = require('./course.schema')

router.get('/subjects', controller.listCourseSubjects)
router.get('/my-courses', controller.myCourses)
router.get('/scheduled-live-classes', controller.getScheduledLiveClasses)
router.get('/', controller.listCourses)
router.get('/:id', controller.getCourse)
router.get('/:id/subjects/:subjectId/materials', controller.getSubjectMaterials)
router.get('/:id/lessons/:lessonId/video-url', controller.getVideoUrl)
router.post('/:id/enroll', controller.enrollFree)
router.post('/:id/review', validate(reviewSchema), controller.addReview)
router.get('/:id/timetable', controller.getTimetable)
router.get('/:id/live/:contentId/join', require('../../middlewares/auth.middleware').authMiddleware, controller.joinLive)
router.get('/:id/checkout', require('../../middlewares/auth.middleware').authMiddleware, controller.checkout)
router.post('/:id/create-razorpay-order', require('../../middlewares/auth.middleware').authMiddleware, controller.createRazorpayOrder)
router.post('/:id/verify-payment', require('../../middlewares/auth.middleware').authMiddleware, controller.verifyPayment)

const multer = require('multer')
const AppError = require('../../core/AppError')
const path = require('path')
const { uploadFile } = require('../../lib/fileUpload')

const ALLOWED_NOTE_MIMES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a',
  'application/octet-stream'
]

const uploadNoteAttachments = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.mp3', '.wav', '.webm', '.ogg', '.m4a']
    if (ALLOWED_NOTE_MIMES.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      return cb(null, true)
    }
    cb(new AppError('Only images (JPEG, PNG, WEBP, GIF) and audio files (MP3, WAV, M4A, OGG) are allowed', 400, 'INVALID_FILE_TYPE'))
  }
})

const attachNoteFiles = async (req, res, next) => {
  try {
    if (req.files) {
      if (req.files.image && req.files.image[0]) {
        const file = req.files.image[0]
        const ext = path.extname(file.originalname) || '.jpg'
        const folder = `notes/images/${Date.now()}`
        req.body.image = await uploadFile(file.buffer, `image${ext}`, folder, file.mimetype)
      }
      if (req.files.audio && req.files.audio[0]) {
        const file = req.files.audio[0]
        const ext = path.extname(file.originalname) || '.mp3'
        const folder = `notes/audio/${Date.now()}`
        req.body.audio = await uploadFile(file.buffer, `audio${ext}`, folder, file.mimetype)
      }
    }
    next()
  } catch (err) {
    next(err)
  }
}

// Content (Video) Notes
router.post(
  '/:id/lessons/:lessonId/notes',
  uploadNoteAttachments.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
  attachNoteFiles,
  validate(noteSchema),
  controller.createNote
)
router.get('/:id/lessons/:lessonId/notes', controller.getNotes)
router.delete('/:id/lessons/:lessonId/notes/:noteId', controller.deleteNote)

module.exports = router
