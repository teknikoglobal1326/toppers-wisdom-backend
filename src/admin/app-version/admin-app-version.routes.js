const router     = require('express').Router()
const controller = require('./admin-app-version.controller')
const { validate } = require('../../core/validate')
const { updateAppVersionSchema } = require('./admin-app-version.schema')

router.get('/',           controller.listAll)
router.get('/:platform',  controller.getOne)
router.put('/:platform',  validate(updateAppVersionSchema), controller.updateVersion)

module.exports = router
