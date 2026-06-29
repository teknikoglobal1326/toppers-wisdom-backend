const router = require('express').Router()
const { requirePermission } = require('../middlewares/permission.middleware')

router.use('/courses', requirePermission('courses'), require('./courses/admin-course.routes'))
router.use('/tests', requirePermission('tests'), require('./tests/admin-test.routes'))
router.use('/boosters', requirePermission('boosters'), require('./boosters/admin-booster.routes'))
router.use('/users', requirePermission('users'), require('./users/admin-user.routes'))
router.use('/blog', requirePermission('blog'), require('./blog/admin-blog.routes'))
router.use('/analytics', requirePermission('analytics'), require('./analytics/admin-analytics.routes'))
router.use('/notifications', requirePermission('notifications'), require('./notifications/admin-notification.routes'))
router.use('/admins', requirePermission('admins'), require('./admins/admin-admins.routes'))
router.use('/exams', requirePermission('exams'), require('./exams/admin-exam.routes'))
router.use('/subexams', requirePermission('subexams'), require('./subexams/admin-subexam.routes'))
router.use('/subjects', requirePermission('subjects'), require('./subjects/admin-subject.routes'))
router.use('/banners', requirePermission('banners'), require('./banners/admin-banner.routes'))
router.use('/shorts', requirePermission('shorts'), require('./shorts/admin-short.routes'))
router.use('/qualifications', requirePermission('qualifications'), require('./qualifications/admin-qualification.routes'))

module.exports = router