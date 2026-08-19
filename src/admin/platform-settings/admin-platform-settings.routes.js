const router = require('express').Router()
const controller = require('../../modules/platform-setting/platform-setting.controller')
const { upload } = require('../../middlewares/upload.middleware')

router.get('/', controller.getSettings)
router.put('/', upload.single('siteLogo'), controller.updateSettings)

module.exports = router
