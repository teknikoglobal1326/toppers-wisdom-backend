const router = require('express').Router()
const controller = require('./admin-wrapper-package.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { 
  createWrapperPackageSchema, 
  updateWrapperPackageSchema, 
  listWrapperPackageQuerySchema 
} = require('./admin-wrapper-package.schema')

router.get('/', validateQuery(listWrapperPackageQuerySchema), controller.list)
router.post('/', upload.single('image'), validate(createWrapperPackageSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateWrapperPackageSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
