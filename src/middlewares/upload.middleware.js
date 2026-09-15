const multer = require('multer')
const path = require('path')
const AppError = require('../core/AppError')

const ALLOWED_IMAGE_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/heic',
  'image/heif'
]

const ALLOWED_VIDEO_MIME = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
  'video/mkv',
  'video/3gpp',
  'video/x-flv',
  'video/mpeg',
  'video/ogg'
]

const ALLOWED_AUDIO_MIME = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/ogg',
  'audio/aac',
  'audio/x-aac',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/webm',
  'audio/flac',
  'audio/x-flac',
  'audio/opus',
  'audio/3gpp',
  'audio/amr',
  'audio/wma',
  'audio/x-ms-wma'
]

const ALLOWED_PDF_MIME = ['application/pdf']

const ALLOWED_BULK_MIME = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml',
  'text/xml',
  'text/csv',
  'application/csv'
]

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico', '.heic', '.heif']
const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.3gp', '.flv', '.m4v', '.mpeg', '.mpg']
const ALLOWED_AUDIO_EXTS = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac', '.opus', '.wma', '.amr', '.weba']
const ALLOWED_PDF_EXTS = ['.pdf']
const ALLOWED_BULK_EXTS = ['.docx', '.doc', '.xlsx', '.xls', '.xml', '.csv']

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (
      ALLOWED_IMAGE_MIME.includes(file.mimetype) ||
      ALLOWED_IMAGE_EXTS.includes(ext) ||
      (file.mimetype && file.mimetype.startsWith('image/'))
    ) {
      return cb(null, true)
    }
    cb(new AppError('Only JPEG, PNG, WEBP, GIF and SVG images are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (ALLOWED_BULK_MIME.includes(file.mimetype) || ALLOWED_BULK_EXTS.includes(ext)) {
      return cb(null, true)
    }
    cb(new AppError('Only Word (.docx, .doc), Excel (.xlsx, .xls), CSV (.csv) and XML (.xml) files are allowed for bulk upload', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadVideo = multer({
  dest: require('os').tmpdir(),
  limits: { fileSize: 2500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    if (
      ALLOWED_VIDEO_MIME.includes(file.mimetype) ||
      ALLOWED_VIDEO_EXTS.includes(ext) ||
      (file.mimetype && file.mimetype.startsWith('video/'))
    ) {
      return cb(null, true)
    }
    cb(new AppError('Only MP4, MOV, AVI, WEBM and MKV videos are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowed = [...ALLOWED_IMAGE_MIME, ...ALLOWED_PDF_MIME]
    if (
      allowed.includes(file.mimetype) ||
      ALLOWED_PDF_EXTS.includes(ext) ||
      ALLOWED_IMAGE_EXTS.includes(ext) ||
      (file.mimetype && (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')))
    ) {
      return cb(null, true)
    }
    cb(new AppError('Only PDF and image files are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadVideoImage = multer({
  dest: require('os').tmpdir(),
  limits: { fileSize: 2500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      ...ALLOWED_IMAGE_MIME,
      ...ALLOWED_VIDEO_MIME,
      ...ALLOWED_AUDIO_MIME,
      ...ALLOWED_PDF_MIME,
    ]
    const allowedExts = [
      ...ALLOWED_IMAGE_EXTS,
      ...ALLOWED_VIDEO_EXTS,
      ...ALLOWED_AUDIO_EXTS,
      ...ALLOWED_PDF_EXTS,
    ]

    const ext = path.extname(file.originalname || '').toLowerCase()

    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExts.includes(ext) ||
      (file.mimetype && (
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/pdf'
      ))
    ) {
      return cb(null, true)
    }

    cb(
      new AppError(
        'Only video, audio, image and PDF files are allowed',
        400,
        'INVALID_FILE_TYPE'
      )
    )
  },
})

// Accepts both image and video fields in a single multipart request (used by shorts)
const uploadShort = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase()
    const allowedMimes = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME]
    const allowedExts = [...ALLOWED_IMAGE_EXTS, ...ALLOWED_VIDEO_EXTS]
    if (
      allowedMimes.includes(file.mimetype) ||
      allowedExts.includes(ext) ||
      (file.mimetype && (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')))
    ) {
      return cb(null, true)
    }
    cb(new AppError('Invalid file type. Use JPEG/PNG/WEBP for thumbnail and MP4/MOV/AVI/WEBM/MKV for video', 400, 'INVALID_FILE_TYPE'))
  },
})

module.exports = { upload, uploadBulk, uploadVideo, uploadPdf, uploadVideoImage, uploadShort }