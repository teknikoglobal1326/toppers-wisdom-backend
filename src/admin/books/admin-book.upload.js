const multer   = require('multer')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')
const { isDualLanguagePayload, parseJsonIfString } = require('../../core/languageUtils')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },  // 50 MB (PDFs can be large)
  fileFilter: (_req, file, cb) => {
    if (['coverImage', 'hiCoverImage', 'enCoverImage'].includes(file.fieldname) && !file.mimetype.startsWith('image/')) {
      return cb(new AppError('Only image files are allowed for coverImage', 400, 'INVALID_FILE_TYPE'))
    }
    if (['file', 'hiFile', 'enFile'].includes(file.fieldname) && file.mimetype !== 'application/pdf') {
      return cb(new AppError('Only PDF files are allowed for file', 400, 'INVALID_FILE_TYPE'))
    }
    cb(null, true)
  },
})

const uploadBookFiles = upload.fields([
  { name: 'coverImage', maxCount: 1 },
  { name: 'file',       maxCount: 1 },
  { name: 'hiCoverImage', maxCount: 1 },
  { name: 'enCoverImage', maxCount: 1 },
  { name: 'hiFile', maxCount: 1 },
  { name: 'enFile', maxCount: 1 },
])

// Runs BEFORE validate: parses JSON string fields so Joi sees the correct types
const parseFields = (req, _res, next) => {
  req.body.hi = parseJsonIfString(req.body.hi)
  req.body.en = parseJsonIfString(req.body.en)

  if (req.body.tags && typeof req.body.tags === 'string') {
    req.body.tags = parseJsonIfString(req.body.tags)
  }

  if (req.body.hi?.tags && typeof req.body.hi.tags === 'string') {
    req.body.hi.tags = parseJsonIfString(req.body.hi.tags)
  }

  if (req.body.en?.tags && typeof req.body.en.tags === 'string') {
    req.body.en.tags = parseJsonIfString(req.body.en.tags)
  }

  next()
}

// Runs AFTER validate: uploads received files to S3 and injects keys into req.body
const parseFiles = async (req, _res, next) => {
  try {
    const folder = `books/${req.params.id ?? `new-${Date.now()}`}`

    const uploadCover = async (file, language) => {
      if (!file) return null
      const ext = file.originalname.split('.').pop().toLowerCase()
      return uploadFile(file.buffer, `cover-${language}-${Date.now()}.${ext}`, folder, file.mimetype)
    }

    const uploadPdf = async (file, language) => {
      if (!file) return null
      return uploadFile(file.buffer, `book-${language}-${Date.now()}.pdf`, folder, file.mimetype)
    }

    if (isDualLanguagePayload(req.body)) {
      const [hiCoverImage, enCoverImage, hiFile, enFile] = await Promise.all([
        uploadCover(req.files?.hiCoverImage?.[0], 'hi'),
        uploadCover(req.files?.enCoverImage?.[0], 'en'),
        uploadPdf(req.files?.hiFile?.[0], 'hi'),
        uploadPdf(req.files?.enFile?.[0], 'en'),
      ])

      if (hiCoverImage) req.body.hi.coverImage = hiCoverImage
      if (enCoverImage) req.body.en.coverImage = enCoverImage
      if (hiFile) req.body.hi.file = hiFile
      if (enFile) req.body.en.file = enFile

      next()
      return
    }

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
