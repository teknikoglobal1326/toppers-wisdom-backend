const router     = require('express').Router()
const controller = require('./admin-short.controller')
const { validate }                             = require('../../core/validate')
const { uploadShort }                          = require('../../middlewares/upload.middleware')
const { createShortSchema, updateShortSchema } = require('./admin-short.schema')

const shortFields = uploadShort.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }])

router.get('/',       controller.list)
router.post('/',      shortFields, validate(createShortSchema), controller.create)
router.get('/:id',    controller.getOne)
router.put('/:id',    shortFields, validate(updateShortSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
