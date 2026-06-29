const router               = require('express').Router()
const catchAsync           = require('../../core/catchAsync')
const { sendSuccess }      = require('../../core/response')
const qualificationService = require('../../modules/qualification/qualification.service')

// GET /api/v1/common/qualifications
router.get('/', catchAsync(async (_req, res) => {
  const qualifications = await qualificationService.listPublic()
  sendSuccess(res, qualifications)
}))

module.exports = router
