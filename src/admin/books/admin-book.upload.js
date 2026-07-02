const multer   = require('multer')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB (PDFs can be large)
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'coverImage' && !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed for coverImage', 400, 'INVALID_FILE_TYPE'))
    }
    if (file.fieldname === 'file' && file.mimetype !== 'application/pdf') {
      return cb(new AppError('Only PDF files are allowed for file', 400, 'INVALID_FILE_TYPE'))
    }
    cb(null, true)
  },
})

const uploadBookFiles = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'file',       maxCount: 1 },
])

// Runs BEFORE validate: parses JSON string fields so Joi sees the correct types
const parseFields = (req, _res, next) => {
  if (req.body.tags && typeof req.body.tags === 'string') {
    try { req.body.tags = JSON.parse(req.body.tags) } catch (_) {}
  }
  next()
}

// Runs AFTER validate: uploads received files to S3 and injects keys into req.body
const parseFiles = async (req, _res, next) => {
  try {
    const folder = `books/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.coverImage?.[0]) {
      const f   = req.files.coverImage[0]
      const ext = f.originalname.split('.').pop().toLowerCase()
      req.body.coverImage = await uploadFile(f.buffer, `cover-${Date.now()}.${ext}`, folder, f.mimetype)
    }

    if (req.files?.file?.[0]) {
      const f   = req.files.file[0]
      req.body.file = await uploadFile(f.buffer, `book-${Date.now()}.pdf`, folder, f.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadBookFiles, parseFields, parseFiles }
