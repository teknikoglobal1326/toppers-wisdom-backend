const Joi = require('joi')

const objectId = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
  'string.pattern.base': '{{#label}} must be a valid MongoDB ObjectId',
})

const subjectItemSchema = Joi.object({
  subject: objectId.required().label('subject'),
  sortOrder: Joi.number().integer().min(0).default(0),
})

const createCourseSchema = Joi.object({
  examId: Joi.array().items(objectId).min(1).required().label('examId'),
  subExam: Joi.array().items(objectId).min(1).required().label('subExam'),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().max(5000).allow('', null),
  longDescription: Joi.string().max(20000).allow('', null),
  language: Joi.string().valid('hi', 'en', 'both').default('hi'),
  type: Joi.string().valid('recorded', 'live', 'free').required(),
  mrp: Joi.number().min(0).default(0),
  price: Joi.number().min(0).default(0),
  isFree: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).default(0),
  thumbnail: Joi.string().max(500).allow('', null),
  validityInMonths: Joi.number().integer().min(0).allow(null),
  status: Joi.string().valid('draft', 'published', 'archived'),
  isLifetime: Joi.boolean().default(false),
  bannerImage: Joi.array().items(Joi.string().max(500)).max(3).default([]),
  // instructor:  instructorSchema,
  subjects: Joi.array().items(subjectItemSchema).default([]),
})

const updateCourseSchema = Joi.object({
  examId: Joi.array().items(objectId).min(1).label('examId'),
  subExam: Joi.array().items(objectId).min(1).label('subExam'),
  title: Joi.string().min(3).max(200),
  status: Joi.string().valid('draft', 'published', 'archived'),
  description: Joi.string().max(5000).allow('', null),
  longDescription: Joi.string().max(20000).allow('', null),
  language: Joi.string().valid('hi', 'en', 'both'),
  type: Joi.string().valid('recorded', 'live', 'free'),
  mrp: Joi.number().min(0),
  price: Joi.number().min(0),
  isFree: Joi.boolean(),
  sortOrder: Joi.number().integer().min(0),
  thumbnail: Joi.string().max(500).allow('', null),
  validityInMonths: Joi.number().integer().min(0).allow(null),
  isLifetime: Joi.boolean(),
  bannerImage: Joi.array().items(Joi.string().max(500)).max(3).default([]),
  // instructor:  instructorSchema,
  subjects: Joi.array().items(subjectItemSchema),
}).min(1).messages({ 'object.min': 'At least one field is required to update' })

const addLessonSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  type: Joi.string().valid('video', 'pdf', 'quiz').required(),
  subject: objectId.allow('', null).label('subject'),
  videoKey: Joi.string().max(500).allow('', null),
  pdfKey: Joi.string().max(500).allow('', null),
  duration: Joi.number().integer().min(0).default(0),
  isPreview: Joi.boolean().default(false),
  sortOrder: Joi.number().integer().min(0).default(0),
  language: Joi.string().valid('hi', 'en').default('hi'),
})

const uploadUrlSchema = Joi.object({
  contentType: Joi.string()
    .valid('video/mp4', 'video/webm', 'application/pdf')
    .required()
    .messages({ 'any.only': 'contentType must be video/mp4, video/webm, or application/pdf' }),
})

const imageUploadSchema = Joi.object({
  contentType: Joi.string()
    .valid('image/jpeg', 'image/png', 'image/webp')
    .required()
    .messages({ 'any.only': 'contentType must be image/jpeg, image/png, or image/webp' }),
})

const listQuerySchema = Joi.object({
  status: Joi.string().valid('draft', 'published', 'archived'),
  type: Joi.string().valid('recorded', 'live', 'free'),
  examId: objectId.label('examId'),
  subExam: objectId.label('subExam'),
  subExamId: objectId.label('subExamId'),
  courseId: objectId.label('courseId'),
  search: Joi.string().trim().max(200),
  title: Joi.string().trim().max(200),
  sortBy: Joi.string().valid('createdAt', 'price', 'sortOrder').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').default('desc'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
})

module.exports = {
  createCourseSchema,
  updateCourseSchema,
  addLessonSchema,
  uploadUrlSchema,
  imageUploadSchema,
  listQuerySchema,
}
