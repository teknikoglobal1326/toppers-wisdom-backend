const multer = require('multer')
const path = require('path')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB per video
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'video' || file.fieldname === 'video_hi' || file.fieldname === 'video_en') {
      if (!file.mimetype.startsWith('video/')) {
        return cb(new AppError('Only video files are allowed for video field', 400, 'INVALID_VIDEO_TYPE'))
      }
    } else if (file.fieldname === 'thumbnail' || file.fieldname === 'thumbnail_hi' || file.fieldname === 'thumbnail_en') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new AppError('Only image files are allowed for thumbnail field', 400, 'INVALID_IMAGE_TYPE'))
      }
    }
    cb(null, true)
  },
})

// Support both single (video, thumbnail) and dual (video_hi, video_en, thumbnail_hi, thumbnail_en)
const uploadShortFiles = upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
  { name: 'video_hi', maxCount: 1 },
  { name: 'video_en', maxCount: 1 },
  { name: 'thumbnail_hi', maxCount: 1 },
  { name: 'thumbnail_en', maxCount: 1 },
])

// Runs after multer: uploads video/thumbnail files
const parseFormData = async (req, _res, next) => {
  try {
    // Handle single video/thumbnail uploads
    if (req.files?.video?.[0]) {
      const file = req.files.video[0]
      const ext = path.extname(file.originalname) || '.mp4'
      const folder = `shorts/${req.params.id ?? `new-${Date.now()}`}`
      req.body.videoUrl = await uploadFile(file.buffer, `${Date.now()}${ext}`, folder, file.mimetype)
    }

    if (req.files?.thumbnail?.[0]) {
      const file = req.files.thumbnail[0]
      const ext = path.extname(file.originalname) || '.jpg'
      const folder = `shorts/thumbnails/${req.params.id ?? `new-${Date.now()}`}`
      req.body.thumbnail = await uploadFile(file.buffer, `thumb-${Date.now()}${ext}`, folder, file.mimetype)
    }

    // Handle dual video/thumbnail uploads (for hi/en separate files)
    if (req.files?.video_hi?.[0] || req.files?.video_en?.[0] || req.files?.thumbnail_hi?.[0] || req.files?.thumbnail_en?.[0]) {
      // Parse hi and en objects if they arrive as strings
      if (req.body.hi && typeof req.body.hi === 'string') {
        req.body.hi = JSON.parse(req.body.hi)
      }
      if (req.body.en && typeof req.body.en === 'string') {
        req.body.en = JSON.parse(req.body.en)
      }

      // Upload hi video
      if (req.files?.video_hi?.[0]) {
        const file = req.files.video_hi[0]
        const ext = path.extname(file.originalname) || '.mp4'
        const folder = `shorts/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `${Date.now()}-hi${ext}`, folder, file.mimetype)
        if (req.body.hi) req.body.hi.videoUrl = uploadedUrl
        else req.body.hi = { videoUrl: uploadedUrl }
      }

      // Upload en video
      if (req.files?.video_en?.[0]) {
        const file = req.files.video_en[0]
        const ext = path.extname(file.originalname) || '.mp4'
        const folder = `shorts/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `${Date.now()}-en${ext}`, folder, file.mimetype)
        if (req.body.en) req.body.en.videoUrl = uploadedUrl
        else req.body.en = { videoUrl: uploadedUrl }
      }

      // Upload hi thumbnail
      if (req.files?.thumbnail_hi?.[0]) {
        const file = req.files.thumbnail_hi[0]
        const ext = path.extname(file.originalname) || '.jpg'
        const folder = `shorts/thumbnails/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `thumb-hi-${Date.now()}${ext}`, folder, file.mimetype)
        if (req.body.hi) req.body.hi.thumbnail = uploadedUrl
        else req.body.hi = { thumbnail: uploadedUrl }
      }

      // Upload en thumbnail
      if (req.files?.thumbnail_en?.[0]) {
        const file = req.files.thumbnail_en[0]
        const ext = path.extname(file.originalname) || '.jpg'
        const folder = `shorts/thumbnails/${req.params.id ?? `new-${Date.now()}`}`
        const uploadedUrl = await uploadFile(file.buffer, `thumb-en-${Date.now()}${ext}`, folder, file.mimetype)
        if (req.body.en) req.body.en.thumbnail = uploadedUrl
        else req.body.en = { thumbnail: uploadedUrl }
      }
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadShortFiles, parseFormData }
