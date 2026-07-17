const multer = require('multer')
const path = require('path')
const { uploadFile } = require('../../lib/fileUpload')
const AppError = require('../../core/AppError')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per image
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'bannerImage' || file.fieldname === 'logo') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new AppError(`Only image files are allowed for ${file.fieldname}`, 400, 'INVALID_IMAGE_TYPE'))
      }
    }
    cb(null, true)
  },
})

const uploadShortCategoryFiles = upload.fields([
  { name: 'bannerImage', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
])

const parseFormData = async (req, _res, next) => {
  try {
    if (req.files?.bannerImage?.[0]) {
      const file = req.files.bannerImage[0]
      const ext = path.extname(file.originalname) || '.jpg'
      const folder = `short-categories/banners/${req.params.id ?? `new-${Date.now()}`}`
      req.body.bannerImage = await uploadFile(file.buffer, `banner-${Date.now()}${ext}`, folder, file.mimetype)
    }

    if (req.files?.logo?.[0]) {
      const file = req.files.logo[0]
      const ext = path.extname(file.originalname) || '.jpg'
      const folder = `short-categories/logos/${req.params.id ?? `new-${Date.now()}`}`
      req.body.logo = await uploadFile(file.buffer, `logo-${Date.now()}${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

module.exports = { uploadShortCategoryFiles, parseFormData }
