const router = require('express').Router()
const controller = require('./admin-content.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createContentSchema, createLiveClassSchema, updateContentSchema, listContentQuerySchema, updateLiveClassSchema } = require('./admin-content.schema')
const { uploadVideoImage } = require('../../middlewares/upload.middleware')
const { attachUploadedFiles } = require('./admin-content.service')

const uploadContentFiles = uploadVideoImage.fields([
  { name: 'video', maxCount: 1 },
  { name: 'image', maxCount: 1 },
])

router.get('/', validateQuery(listContentQuerySchema), controller.list)
router.post('/', uploadContentFiles, attachUploadedFiles, validate(createContentSchema), controller.create)
router.post('/live', uploadContentFiles, attachUploadedFiles, validate(createLiveClassSchema), controller.createLiveClass)
router.get('/live', validateQuery(listContentQuerySchema), controller.listLiveClasses)
router.patch('/live/:id', uploadContentFiles, attachUploadedFiles, validate(updateLiveClassSchema), controller.updateLiveClass)
router.put('/:id/go-live', controller.goLive)
router.put('/:id/end-live', controller.endLive)
router.get('/:id', controller.getOne)
router.patch('/:id', uploadContentFiles, attachUploadedFiles, validate(updateContentSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
