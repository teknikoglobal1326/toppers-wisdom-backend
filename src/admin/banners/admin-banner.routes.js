const router = require('express').Router()
const controller = require('./admin-banner.controller')
const { validate } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { isDualLanguagePayload, parseDualLanguageFields } = require('../../core/languageUtils')
const { createBannerSchema, createBannerDualSchema, updateBannerSchema } = require('./admin-banner.schema')

const uploadBannerCreateFiles = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'hiImage', maxCount: 1 },
  { name: 'enImage', maxCount: 1 },
])

const validateCreate = (req, res, next) => {
  const schema = isDualLanguagePayload(req.body) ? createBannerDualSchema : createBannerSchema
  return validate(schema)(req, res, next)
}

router.get('/', controller.list)
router.post('/', uploadBannerCreateFiles, parseDualLanguageFields, validateCreate, controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateBannerSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
