const Joi = require('joi')

const listBooksSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  section: Joi.string().valid('myBooks', 'eBooks', 'books', 'audioBooks').optional(),
  q: Joi.string().trim().optional().allow('', null),
  isFree: Joi.boolean().optional(),
  examId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().label('examId'),
  subExam: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional().label('subExam'),
})

module.exports = { listBooksSchema }
