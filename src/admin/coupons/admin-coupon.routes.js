const router = require('express').Router()
const controller = require('./admin-coupon.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createCouponSchema, updateCouponSchema, listCouponQuerySchema } = require('./admin-coupon.schema')

router.get('/', validateQuery(listCouponQuerySchema), controller.list)
router.post('/', validate(createCouponSchema), controller.create)
router.get('/:id', controller.getOne)
router.put('/:id', validate(updateCouponSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
