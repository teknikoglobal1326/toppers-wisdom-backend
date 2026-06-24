const multer  = require('multer')
const AppError = require('../core/AppError')

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Only JPEG, PNG, WEBP and GIF images are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Only MP4, MOV, AVI and WEBM videos are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

// Accepts both image and video fields in a single multipart request (used by shorts)
const uploadShort = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME]
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Invalid file type. Use JPEG/PNG/WEBP for thumbnail and MP4/MOV/AVI/WEBM for video', 400, 'INVALID_FILE_TYPE'))
  },
})

module.exports = { upload, uploadVideo, uploadShort }
