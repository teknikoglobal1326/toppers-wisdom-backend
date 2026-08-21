const router = require('express').Router()
const controller = require('./admin-calendar-exam.controller')
const { validate, validateQuery } = require('../../core/validate')
const { createCalendarExamSchema, updateCalendarExamSchema, listCalendarExamQuerySchema } = require('./admin-calendar-exam.schema')
const { upload } = require('../../middlewares/upload.middleware')

const uploadSingleImage = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) return next(err)

    // Trim trailing/leading spaces from req.body keys to prevent validation/mapping issues
    const trimmedBody = {}
    for (const key of Object.keys(req.body || {})) {
      trimmedBody[key.trim()] = req.body[key]
    }
    req.body = trimmedBody

    // Parse stringified arrays for exams and sub-exams from form-data
    const arrayKeys = ['exams', 'subExams']
    for (const key of arrayKeys) {
      if (typeof req.body[key] === 'string') {
        try {
          const parsed = JSON.parse(req.body[key])
          req.body[key] = Array.isArray(parsed) ? parsed.filter(Boolean) : [parsed].filter(Boolean)
        } catch (_) {
          if (req.body[key] && req.body[key] !== '[]' && req.body[key] !== 'null') {
            // Check if it is a comma separated string
            if (req.body[key].includes(',')) {
              req.body[key] = req.body[key].split(',').map(s => s.trim()).filter(Boolean)
            } else {
              req.body[key] = [req.body[key]].filter(Boolean)
            }
          } else {
            req.body[key] = []
          }
        }
      }
    }

    // Find and attach the uploaded file to req.file, mapping trimmed fieldname
    if (Array.isArray(req.files) && req.files.length > 0) {
      const file = req.files.find(f => f.fieldname.trim() === 'image') || req.files[0]
      req.file = file
    }

    next()
  })
}

router.get('/', validateQuery(listCalendarExamQuerySchema), controller.list)
router.get('/:id', controller.getOne)
router.post('/', uploadSingleImage, validate(createCalendarExamSchema), controller.create)
router.patch('/:id', uploadSingleImage, validate(updateCalendarExamSchema), controller.update)
router.delete('/:id', controller.remove)

module.exports = router
