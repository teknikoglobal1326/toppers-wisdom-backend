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

// thumbnail  → single file  (key: "thumbnail")
// bannerImage → up to 3 files (key: "bannerImage[]")
const uploadCourseImages = upload.fields([
  { name: 'thumbnail',    maxCount: 1 },
  { name: 'bannerImage[]', maxCount: 3 },
])

// Runs after multer: parses JSON-stringified fields and uploads any received images
const parseFormData = async (req, _res, next) => {
  try {
    // subjects arrives as a JSON string from form-data e.g. '[{"subject":"...","sortOrder":1}]'
    if (req.body.subjects && typeof req.body.subjects === 'string') {
      try { req.body.subjects = JSON.parse(req.body.subjects) } catch (_) { /* leave as-is, Joi will reject */ }
    }

    const folder = `courses/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.thumbnail?.[0]) {
      const f   = req.files.thumbnail[0]
      const ext = f.originalname.split('.').pop().toLowerCase()
      req.body.thumbnail = await uploadFile(f.buffer, `thumbnail.${ext}`, folder, f.mimetype)
    }

    const bannerFiles = req.files?.['bannerImage[]']
    if (bannerFiles?.length) {
      req.body.bannerImage = await Promise.all(
        bannerFiles.map((f, i) => {
          const ext = f.originalname.split('.').pop().toLowerCase()
          return uploadFile(f.buffer, `banner-${i + 1}.${ext}`, folder, f.mimetype)
        })
      )
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadCourseImages, parseFormData }
