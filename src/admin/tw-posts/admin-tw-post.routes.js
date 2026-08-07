const router = require('express').Router()
const controller = require('./admin-tw-post.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createTWPostSchema, updateTWPostSchema, listTWPostQuerySchema } = require('./admin-tw-post.schema')

router.get('/', validateQuery(listTWPostQuerySchema), controller.list)
router.post('/', upload.single('image'), validate(createTWPostSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', upload.single('image'), validate(updateTWPostSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
