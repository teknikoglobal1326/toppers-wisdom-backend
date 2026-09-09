const path = require('path')
const multer = require('multer')
const AppError = require('../../core/AppError')
const { uploadVideoImage } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadVocabularyMedia = uploadVideoImage.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
])

const parseFormData = async (req, _res, next) => {
  try {
    const arrayKeys = ['usages', 'synonyms', 'antonyms', 'editorailTest', 'editorialTest', 'testId']
    for (const key of arrayKeys) {
      if (typeof req.body[key] === 'string') {
        try {
          const parsed = JSON.parse(req.body[key])
          req.body[key] = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean)
        } catch (_) {
          if (req.body[key] && req.body[key] !== '[]' && req.body[key] !== 'null') {
            if (req.body[key].includes(',')) {
              req.body[key] = req.body[key].split(',').map(s => s.trim()).filter(Boolean)
            } else {
              req.body[key] = [req.body[key]].filter(Boolean)
            }
          } else {
            req.body[key] = []
          }
        }
      }
    }

    const folder = `editorial-vocabularies/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.thumbnail?.[0]) {
      const file = req.files.thumbnail[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.thumbnail = await uploadFile(file, `thumbnail-${Date.now()}${ext}`, folder, file.mimetype)
    }

    if (req.files?.bannerImage?.[0]) {
      const file = req.files.bannerImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.bannerImage = await uploadFile(file, `banner-${Date.now()}${ext}`, folder, file.mimetype)
    }

    if (req.files?.audio?.[0]) {
      const file = req.files.audio[0]
      const ext = path.extname(file.originalname) || '.mp3'
      req.body.audio = await uploadFile(file, `audio-${Date.now()}${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

const uploadBulk = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.docx', '.doc']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowedExtensions.includes(ext) || file.fieldname === 'file') {
      return cb(null, true)
    }
    return cb(new AppError('Invalid file type. Please upload Excel (.xlsx, .xls, .csv) or Word (.docx, .doc) file', 400, 'INVALID_FILE_TYPE'))
  },
})

const uploadBulkFile = uploadBulk.single('file')

module.exports = { uploadVocabularyMedia, parseFormData, uploadBulkFile }