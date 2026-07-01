const multer = require('multer')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize:  5 * 1024 * 1024,   // 5 MB per image
    fieldSize: 10 * 1024 * 1024,  // 10 MB per text field (HTML content)
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed', 400, 'INVALID_FILE_TYPE'))
    }
    cb(null, true)
  },
})

// image → single file (key: "image")
const uploadBlogImage = upload.single('image')

// Runs after multer: parses JSON-stringified fields and uploads the image if received
const parseFormData = async (req, _res, next) => {
  try {
    // tags arrives as a JSON string from form-data e.g. '["tag1","tag2"]'
    if (req.body.tags && typeof req.body.tags === 'string') {
      try { req.body.tags = JSON.parse(req.body.tags) } catch (_) { /* leave as-is, Joi will reject */ }
    }

    // longDescription can arrive as an array when multipart sends the field more than once;
    // join the parts so Joi always receives a plain string
    if (Array.isArray(req.body.longDescription)) {
      req.body.longDescription = req.body.longDescription.join('')
    }

    if (req.file) {
      const ext = req.file.originalname.split('.').pop().toLowerCase()
      const folder = `blog/${req.params.id ?? `new-${Date.now()}`}`
      req.body.image = await uploadFile(req.file.buffer, `image-${Date.now()}.${ext}`, folder, req.file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadBlogImage, parseFormData }
