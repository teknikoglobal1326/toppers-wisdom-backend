const router = require('express').Router()
const controller = require('./faculty.controller')

router.get('/', controller.listFaculties)
router.get('/:id', controller.getFacultyById)

module.exports = router
