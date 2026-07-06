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

// Support both single image and dual images (image_hi, image_en)
const uploadBlogImage = upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image_hi', maxCount: 1 }, { name: 'image_en', maxCount: 1 }])

// Runs after multer: parses JSON-stringified fields and uploads the image if received
const parseFormData = async (req, _res, next) => {
  try {
    // Parse hi/en JSON if provided as strings in multipart forms
    if (req.body.hi && typeof req.body.hi === 'string') {
      try { req.body.hi = JSON.parse(req.body.hi) } catch (_) { /* leave as-is, Joi will reject */ }
    }
    if (req.body.en && typeof req.body.en === 'string') {
      try { req.body.en = JSON.parse(req.body.en) } catch (_) { /* leave as-is, Joi will reject */ }
    }

    // Parse tags JSON if provided as string
    if (req.body.tags && typeof req.body.tags === 'string') {
      try { req.body.tags = JSON.parse(req.body.tags) } catch (_) { /* leave as-is, Joi will reject */ }
    }

    // Join longDescription if it arrives as array
    if (Array.isArray(req.body.longDescription)) {
      req.body.longDescription = req.body.longDescription.join('')
    }

    // Handle single image upload
    if (req.files?.image?.[0]) {
      const file = req.files.image[0]
      const ext = file.originalname.split('.').pop().toLowerCase()
      const folder = `blog/${req.params.id ?? `new-${Date.now()}`}`
      req.body.image = await uploadFile(file.buffer, `image-${Date.now()}.${ext}`, folder, file.mimetype)
    }

    // Handle dual image uploads (for hi/en separate images)
    if (req.files?.image_hi?.[0] || req.files?.image_en?.[0]) {
      // Upload hi image
      if (req.files?.image_hi?.[0]) {
        const file = req.files.image_hi[0]
        const ext = file.originalname.split('.').pop().toLowerCase()
        const folder = `blog/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `image-hi-${Date.now()}.${ext}`, folder, file.mimetype)
        if (req.body.hi) req.body.hi.image = uploadedUrl
        else req.body.hi = { image: uploadedUrl }
      }

      // Upload en image
      if (req.files?.image_en?.[0]) {
        const file = req.files.image_en[0]
        const ext = file.originalname.split('.').pop().toLowerCase()
        const folder = `blog/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `image-en-${Date.now()}.${ext}`, folder, file.mimetype)
        if (req.body.en) req.body.en.image = uploadedUrl
        else req.body.en = { image: uploadedUrl }
      }
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadBlogImage, parseFormData }
