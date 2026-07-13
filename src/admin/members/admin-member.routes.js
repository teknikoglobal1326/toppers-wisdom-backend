const router = require('express').Router()
const controller = require('./admin-member.controller')
const { validate, validateQuery } = require('../../core/validate')
const { upload } = require('../../middlewares/upload.middleware')
const { createMemberSchema, updateMemberSchema, listMemberQuerySchema } = require('./admin-member.schema')

router.get('/', validateQuery(listMemberQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', upload.single('profileImage'), validate(createMemberSchema), controller.create)
router.patch('/:id', upload.single('profileImage'), validate(updateMemberSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
