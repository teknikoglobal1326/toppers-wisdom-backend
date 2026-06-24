const router = require('express').Router()
const controller = require('./admin-exam.controller')
const { validate } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createExamSchema, updateExamSchema } = require('./admin-exam.schema')

router.get('/', controller.list)
router.post('/', upload.single('image'), validate(createExamSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateExamSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
