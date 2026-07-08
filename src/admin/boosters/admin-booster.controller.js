const catchAsync        = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const BaseService       = require('../../core/BaseService')
const boosterRepository = require('../../modules/booster/booster.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger }  = require('../../config/logger')
const { createWithLanguage } = require('../../core/createWithLanguage')

class AdminBoosterService extends BaseService {
  constructor() {
    super(boosterRepository, 'admin:booster')
    this.logger = createLogger('admin:booster:service')
  }

  async create(data) {
    return createWithLanguage((d) => {
      const payload = { ...d }
      if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
        const parsedSortOrder = Number(payload.sortOrder)
        if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
      }
      return super.create(payload)
    }, data)
  }

  async listAll(f) {
    const filter = {}
    if (f.exam)    filter.exam    = f.exam
    if (f.subExam) filter.subExam = f.subExam
    if (f.type)    filter.type    = f.type
    const direction = f.sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, { page: f.page, limit: f.limit, sort: { sortOrder: direction, createdAt: -1 } })
  }

  async update(id, data) {
    const payload = { ...data }
    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsedSortOrder = Number(payload.sortOrder)
      if (!Number.isNaN(parsedSortOrder)) payload.sortOrder = parsedSortOrder
    }
    return super.update(id, payload)
  }

  async getUploadUrl(id, field, contentType) {
    const key = `boosters/${id}/${field}`
    return getPresignedUploadUrl(key, contentType)
  }
}

const svc = new AdminBoosterService()

const listAll       = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne        = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const createBooster = catchAsync(async (req, res) => { sendCreated(res, await svc.create(req.body)) })
const updateBooster = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const deleteBooster = catchAsync(async (req, res) => { await svc.remove(req.params.id); sendSuccess(res, null, 'Booster deleted') })
const getUploadUrl  = catchAsync(async (req, res) => { sendSuccess(res, await svc.getUploadUrl(req.params.id, req.body.field, req.body.contentType)) })

module.exports = { listAll, getOne, createBooster, updateBooster, deleteBooster, getUploadUrl }
