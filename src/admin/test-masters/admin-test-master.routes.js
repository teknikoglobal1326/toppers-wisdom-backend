const router     = require('express').Router()
const controller = require('./admin-test-master.controller')
const { uploadThumbnail, parseThumbnail } = require('../test-management-thumbnail.upload')

router.get('/',                                                  controller.listAll)
router.post('/',   uploadThumbnail, parseThumbnail('test-masters/thumbnails'), controller.createTest)
router.get('/:id',                                               controller.getOne)
router.put('/:id',  uploadThumbnail, parseThumbnail('test-masters/thumbnails'), controller.updateTest)
router.delete('/:id',                                            controller.deleteTest)
router.patch('/:id/publish',                                     controller.publish)
router.post('/:id/assign',                                       controller.assignTest)

module.exports = router