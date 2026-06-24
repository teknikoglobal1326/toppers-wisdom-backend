const router = require('express').Router()
const controller = require('./admin-banner.controller')
const { validate } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createBannerSchema, updateBannerSchema } = require('./admin-banner.schema')

router.get('/', controller.list)
router.post('/', upload.single('image'), validate(createBannerSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateBannerSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router