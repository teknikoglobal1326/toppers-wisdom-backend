const multer    = require('multer')
const { uploadFile } = require('../../lib/fileUpload')
const AppError  = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },  // 10 MB
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/')
    if ((file.fieldname === 'thumbnailImage' || file.fieldname === 'bannerImage') && !isImage) {
      return cb(new AppError('Only image files are allowed for thumbnailImage and bannerImage', 400, 'INVALID_FILE_TYPE'))
    }
    cb(null, true)
  },
})

const uploadBoosterFiles = upload.fields([
  { name: 'thumbnailImage', maxCount: 1 },
  { name: 'bannerImage',    maxCount: 1 },
  { name: 'file',           maxCount: 1 },
])

// Runs BEFORE validate: parses JSON string fields so Joi receives correct types
const parseFields = (req, _res, next) => {
  if (req.body.tag && typeof req.body.tag === 'string') {
    try { req.body.tag = JSON.parse(req.body.tag) } catch (_) { /* leave as-is, Joi will reject */ }
  }
  if (Array.isArray(req.body.longDescription)) {
    req.body.longDescription = req.body.longDescription.join('')
  }
  next()
}

// Runs AFTER validate: uploads received files to S3 and injects keys into req.body
const parseFiles = async (req, _res, next) => {
  try {
    const folder = `boosters/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.thumbnailImage?.[0]) {
      const f   = req.files.thumbnailImage[0]
      const ext = f.originalname.split('.').pop().toLowerCase()
      req.body.thumbnailImage = await uploadFile(f.buffer, `thumbnail-${Date.now()}.${ext}`, folder, f.mimetype)
    }

    if (req.files?.bannerImage?.[0]) {
      const f   = req.files.bannerImage[0]
      const ext = f.originalname.split('.').pop().toLowerCase()
      req.body.bannerImage = await uploadFile(f.buffer, `banner-${Date.now()}.${ext}`, folder, f.mimetype)
    }

    if (req.files?.file?.[0]) {
      const f   = req.files.file[0]
      const ext = f.originalname.split('.').pop().toLowerCase()
      req.body.file = await uploadFile(f.buffer, `file-${Date.now()}.${ext}`, folder, f.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadBoosterFiles, parseFields, parseFiles }
