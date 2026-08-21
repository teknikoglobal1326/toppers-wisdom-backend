const router = require('express').Router()
const controller = require('./admin-faculty.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createFacultySchema, updateFacultySchema, listFacultyQuerySchema } = require('./admin-faculty.schema')

router.get('/', validateQuery(listFacultyQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', upload.single('image'), validate(createFacultySchema), controller.create)
router.put('/:id', upload.single('image'), validate(updateFacultySchema), controller.update)
router.patch('/:id', upload.single('image'), validate(updateFacultySchema), controller.update)
router.delete('/:id', controller.remove)
router.delete('/:id/hard', controller.hardRemove)

module.exports = router
