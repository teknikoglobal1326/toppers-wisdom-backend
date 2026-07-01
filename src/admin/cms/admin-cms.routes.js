const router     = require('express').Router()
const controller = require('./admin-cms.controller')
const { validate } = require('../../core/validate')
const { updateCmsSchema } = require('./admin-cms.schema')

router.get('/', controller.listAll)
router.get('/:type', controller.getPage)
router.put('/:type', validate(updateCmsSchema), controller.updatePage)

module.exports = router
