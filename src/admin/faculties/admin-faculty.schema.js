const Joi = require('joi')

const createFacultySchema = Joi.object({
  name: Joi.string().trim().required(),
  facultyName: Joi.string().trim().optional(),
  designation: Joi.string().trim().allow('').optional().default(''),
  totalExperience: Joi.string().trim().allow('').optional().default(''),
  specialization: Joi.string().trim().allow('').optional().default(''),
  skills: Joi.array().items(Joi.string().trim()).optional().default([]),
  subject: Joi.string().trim().allow('').optional().default(''),
  subjectId: Joi.string().trim().allow('', null).optional(),
  bio: Joi.string().trim().allow('').optional().default(''),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').default('active'),
  examId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  subexamId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  courseId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  image: Joi.string().trim().allow('', null).optional(),
  profilePhoto: Joi.string().trim().allow('', null).optional(),
  sortOrder: Joi.number().integer().min(0).optional().default(0)
})

const updateFacultySchema = Joi.object({
  name: Joi.string().trim().optional(),
  facultyName: Joi.string().trim().optional(),
  designation: Joi.string().trim().allow('').optional(),
  totalExperience: Joi.string().trim().allow('').optional(),
  specialization: Joi.string().trim().allow('').optional(),
  skills: Joi.array().items(Joi.string().trim()).optional(),
  subject: Joi.string().trim().allow('').optional(),
  subjectId: Joi.string().trim().allow('', null).optional(),
  bio: Joi.string().trim().allow('').optional(),
  description: Joi.string().trim().allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'Active', 'Inactive').optional(),
  examId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  subexamId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  courseId: Joi.string().trim().allow('', null, 'null', 'undefined').optional(),
  image: Joi.string().trim().allow('', null).optional(),
  profilePhoto: Joi.string().trim().allow('', null).optional(),
  sortOrder: Joi.number().integer().min(0).optional()
}).min(1)

const listFacultyQuerySchema = Joi.object({
  search: Joi.string().trim().optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  examId: Joi.string().trim().optional(),
  subexamId: Joi.string().trim().optional(),
  courseId: Joi.string().trim().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
})

module.exports = {
  createFacultySchema,
  updateFacultySchema,
  listFacultyQuerySchema
}
