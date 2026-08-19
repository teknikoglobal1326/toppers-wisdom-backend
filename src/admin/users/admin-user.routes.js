const router     = require('express').Router()
const controller = require('./admin-user.controller')

router.get('/',                            controller.listAll)
router.get('/:id',                         controller.getOne)
router.patch('/:id',                       controller.updateUser)
router.get('/:id/orders',                  controller.getUserOrders)
router.get('/:id/enrollments',             controller.getUserEnrollments)
router.get('/:id/attempts',                controller.getUserAttempts)

// Subscriptions management for user
router.post('/:id/subscription',           controller.allocateSubscription)
router.patch('/:id/subscription/expiry',   controller.updateSubscriptionExpiry)
router.delete('/:id/subscription',         controller.revokeSubscription)

// Course enrollment management for user
router.post('/:id/courses',                controller.allocateCourse)
router.patch('/:id/courses/:courseId/expiry', controller.updateCourseExpiry)
router.delete('/:id/courses/:courseId',    controller.removeCourseEnrollment)

module.exports = router
