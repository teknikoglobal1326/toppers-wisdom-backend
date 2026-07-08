const router     = require('express').Router()
const controller = require('./admin-blog.controller')
const { validate, validateQuery } = require('../../core/validate')
const { uploadBlogImage, parseFormData } = require('./admin-blog.upload')
const { createBlogSchema, createBlogDualSchema, updateBlogSchema, updateBlogDualSchema, listBlogQuerySchema } = require('./admin-blog.schema')

const validateCreate = (req, res, next) => {
  const schema = (req.body.hi && req.body.en) ? createBlogDualSchema : createBlogSchema
  return validate(schema)(req, res, next)
}

router.get('/',              validateQuery(listBlogQuerySchema), controller.listAll)
router.post('/',             uploadBlogImage, parseFormData, validateCreate, controller.createPost)
router.put('/dual',          uploadBlogImage, parseFormData, validate(updateBlogDualSchema), controller.updatePostDual)
router.get('/:id',           controller.getOne)
router.put('/:id',           uploadBlogImage, parseFormData, validate(updateBlogSchema), controller.updatePost)
router.delete('/:id',        controller.deletePost)
router.patch('/:id/publish', controller.publish)

module.exports = router
