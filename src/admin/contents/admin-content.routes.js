const path = require('path')
const router = require('express').Router()
const controller = require('./admin-content.controller')
const { validate } = require('../../core/validate')
const { createContentSchema, updateContentSchema } = require('./admin-content.schema')
const { uploadVideoImage } = require('../../middlewares/upload.middleware')
const { uploadFile } = require('../../lib/fileUpload')

const uploadContentFiles = uploadVideoImage.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

const attachUploadedFiles = async (req, _res, next) => {
  try {
    const folder = `contents/${req.params.id ?? `new-${Date.now()}`}`

    if (req.files?.video?.[0]) {
      const file = req.files.video[0]
      const ext = path.extname(file.originalname) || '.mp4'
      req.body.video = await uploadFile(file.buffer, `video${ext}`, folder, file.mimetype)
    }

    if (req.files?.image?.[0]) {
      const file = req.files.image[0]
      const ext = path.extname(file.originalname) || '.jpg'
      req.body.image = await uploadFile(file.buffer, `image${ext}`, folder, file.mimetype)
    }

    next()
  } catch (err) {
    next(err)
  }
}

router.get('/', controller.list)
router.post('/', uploadContentFiles, attachUploadedFiles, validate(createContentSchema), controller.create)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadContentFiles, attachUploadedFiles, validate(updateContentSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
