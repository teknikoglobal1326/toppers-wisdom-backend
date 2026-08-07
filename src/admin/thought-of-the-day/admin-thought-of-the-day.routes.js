const router = require('express').Router()
const controller = require('./admin-thought-of-the-day.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createThoughtSchema, updateThoughtSchema, listThoughtQuerySchema } = require('./admin-thought-of-the-day.schema')

router.get('/', validateQuery(listThoughtQuerySchema), controller.list)
router.post('/', upload.single('authorImage'), validate(createThoughtSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('authorImage'), validate(updateThoughtSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
