const Joi = require('joi')

const announcementBlockSchema = Joi.object({
  text: Joi.string().trim().required(),
  priority: Joi.number().integer().min(0).default(0)
})

const createNotificationSchema = Joi.object({
  title: Joi.string().trim().required(),
  message: Joi.string().trim().required(),
  image: Joi.string().trim().allow('', null).optional(),
  notificationType: Joi.string().trim().default('marketing'),
  schedule: Joi.date().required(),
  examId: Joi.string().optional().allow('', null),
  subExamId: Joi.string().optional().allow('', null),
  all: Joi.boolean().optional(),
  moduleType: Joi.string().optional().allow('', null),
  moduleId: Joi.string().optional().allow('', null),
  countdown: Joi.date().optional().allow('', null),
})

const updateNotificationSchema = Joi.object({
  title: Joi.string().trim().optional(),
  message: Joi.string().trim().optional(),
  image: Joi.string().trim().allow('', null).optional(),
  notificationType: Joi.string().trim().optional(),
  schedule: Joi.date().optional(),
  examId: Joi.string().optional().allow('', null),
  subExamId: Joi.string().optional().allow('', null),
  all: Joi.boolean().optional(),
  moduleType: Joi.string().optional().allow('', null),
  moduleId: Joi.string().optional().allow('', null),
  countdown: Joi.date().optional().allow('', null),
}).min(1)

const createAnnouncementSchema = Joi.object({
  title: Joi.string().trim().required(),
  image: Joi.string().trim().allow('', null).optional(),
  highlightedText: Joi.string().trim().allow('').optional().default(''),
  redirectUrl: Joi.string().trim().allow('').optional().default(''),
  iconStatus: Joi.string().trim().default('active'),
  announcementBlocks: Joi.array().items(announcementBlockSchema).min(1).required(),
  schedule: Joi.date().optional().allow('', null),
  countdown: Joi.date().optional().allow('', null),
  examId: Joi.string().optional().allow('', null),
  subExamId: Joi.string().optional().allow('', null),
  all: Joi.boolean().optional(),
  moduleType: Joi.string().optional().allow('', null),
  moduleId: Joi.string().optional().allow('', null),
})

const updateAnnouncementSchema = Joi.object({
  title: Joi.string().trim().optional(),
  image: Joi.string().trim().allow('', null).optional(),
  highlightedText: Joi.string().trim().allow('').optional(),
  redirectUrl: Joi.string().trim().allow('').optional(),
  iconStatus: Joi.string().trim().optional(),
  announcementBlocks: Joi.array().items(announcementBlockSchema).min(1).optional(),
  schedule: Joi.date().optional().allow('', null),
  countdown: Joi.date().optional().allow('', null),
  examId: Joi.string().optional().allow('', null),
  subExamId: Joi.string().optional().allow('', null),
  all: Joi.boolean().optional(),
  moduleType: Joi.string().optional().allow('', null),
  moduleId: Joi.string().optional().allow('', null),
}).min(1)

const listCampaignQuerySchema = Joi.object({
  isProcessed: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(20),
  search: Joi.string().optional().allow(''),
  subtitle: Joi.string().optional().allow(''),
  status: Joi.string().optional().allow(''),
  sortOrder: Joi.string().optional().allow('')
})

module.exports = {
  createNotificationSchema,
  updateNotificationSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
  listCampaignQuerySchema
}
