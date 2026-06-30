const multer = require('multer')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'))
    }
    cb(null, true)
  },
})

// avatar → single file (key: "avatar")
const uploadAvatar = upload.single('avatar')

// Runs after multer: parses JSON-stringified fields and uploads the avatar if received
const parseFormData = async (req, _res, next) => {
  try {
    if (req.body.subexamIds && typeof req.body.subexamIds === 'string') {
      try { req.body.subexamIds = JSON.parse(req.body.subexamIds) } catch (_) { /* leave as-is, Joi will reject */ }
    }

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase()
      req.body.avatar = await uploadFile(req.file.buffer, `avatar-${Date.now()}.${ext}`, `users/${req.user._id}`, req.file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadAvatar, parseFormData }
