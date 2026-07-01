const router     = require('express').Router()
const controller = require('./admin-blog.controller')
const { validate } = require('../../core/validate')
const { uploadBlogImage, parseFormData } = require('./admin-blog.upload')
const { createBlogSchema, updateBlogSchema } = require('./admin-blog.schema')

router.get('/',              controller.listAll)
router.post('/',             uploadBlogImage, parseFormData, validate(createBlogSchema), controller.createPost)
router.get('/:id',           controller.getOne)
router.put('/:id',           uploadBlogImage, parseFormData, validate(updateBlogSchema), controller.updatePost)
router.delete('/:id',        controller.deletePost)
router.patch('/:id/publish', controller.publish)

module.exports = router
