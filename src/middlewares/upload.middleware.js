const multer = require('multer')
const path = require('path')
const AppError = require('../core/AppError')

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
const ALLOWED_PDF_MIME = ['application/pdf']
const ALLOWED_BULK_MIME = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/xml',
  'text/xml',
]

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Only JPEG, PNG, WEBP and GIF images are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.xml']
    if (ALLOWED_BULK_MIME.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      return cb(null, true)
    }
    cb(new AppError('Only Word (.docx, .doc), Excel (.xlsx, .xls) and XML (.xml) files are allowed for bulk upload', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_VIDEO_MIME.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Only MP4, MOV, AVI and WEBM videos are allowed', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadPdf = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    // console.log("=== uploadPdf ===");
    // console.log(file.originalname);
    // console.log(file.mimetype);

    const allowed = [...ALLOWED_IMAGE_MIME, ...ALLOWED_PDF_MIME];

    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(new AppError("Only PDF and image files are allowed", 400, "INVALID_FILE_TYPE"));
  },
});


const uploadVideoImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      ...ALLOWED_IMAGE_MIME,
      ...ALLOWED_VIDEO_MIME,
      ...ALLOWED_PDF_MIME,
    ];

    if (allowed.includes(file.mimetype)) {
      return cb(null, true);
    }

    cb(
      new AppError(
        'Only video, image and PDF files are allowed',
        400,
        'INVALID_FILE_TYPE'
      )
    );
  },
});


// Accepts both image and video fields in a single multipart request (used by shorts)
const uploadShort = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [...ALLOWED_IMAGE_MIME, ...ALLOWED_VIDEO_MIME]
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new AppError('Invalid file type. Use JPEG/PNG/WEBP for thumbnail and MP4/MOV/AVI/WEBM for video', 400, 'INVALID_FILE_TYPE'))
  },
})

module.exports = { upload, uploadBulk, uploadVideo, uploadPdf, uploadVideoImage, uploadShort }
