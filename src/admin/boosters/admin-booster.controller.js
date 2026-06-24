const catchAsync       = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const BaseService      = require('../../core/BaseService')
const boosterRepository = require('../../modules/booster/booster.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger } = require('../../config/logger')

class AdminBoosterService extends BaseService {
  constructor() {
    super(boosterRepository, 'admin:booster')
    this.logger = createLogger('admin:booster:service')
  }
  async listAll(f)             { return this.getAll(f.subExam ? { subExam: f.subExam } : {}, { page: f.page, limit: f.limit }) }
  async addItem(id, item)      { this.logger.info({ id }, 'Adding booster item'); return boosterRepository.addItem(id, item) }
  async updateItem(id, iid, d) { return boosterRepository.updateItem(id, iid, d) }
  async removeItem(id, iid)    { return boosterRepository.removeItem(id, iid) }
  async getUploadUrl(id, iid, contentType) {
    const key = `boosters/${id}/items/${iid}/${contentType.startsWith('audio') ? 'audio' : 'pdf'}`
    return getPresignedUploadUrl(key, contentType)
  }
}

const svc = new AdminBoosterService()

const listAll       = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne        = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const createBooster = catchAsync(async (req, res) => { sendCreated(res, await svc.create(req.body)) })
const updateBooster = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const deleteBooster = catchAsync(async (req, res) => { await svc.remove(req.params.id); sendSuccess(res, null, 'Booster deleted') })
const addItem       = catchAsync(async (req, res) => { sendCreated(res, await svc.addItem(req.params.id, req.body)) })
const updateItem    = catchAsync(async (req, res) => { sendSuccess(res, await svc.updateItem(req.params.id, req.params.itemId, req.body)) })
const removeItem    = catchAsync(async (req, res) => { await svc.removeItem(req.params.id, req.params.itemId); sendSuccess(res, null, 'Item removed') })
const getUploadUrl  = catchAsync(async (req, res) => { sendSuccess(res, await svc.getUploadUrl(req.params.id, req.params.itemId, req.body.contentType)) })

module.exports = { listAll, getOne, createBooster, updateBooster, deleteBooster, addItem, updateItem, removeItem, getUploadUrl }
