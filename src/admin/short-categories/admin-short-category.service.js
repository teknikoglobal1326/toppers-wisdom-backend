const path = require('path')
const BaseService = require('../../core/BaseService')
const shortCategoryRepository = require('../../modules/short-category/short-category.repository')
const AppError = require('../../core/AppError')
const { uploadFile } = require('../../lib/fileUpload')

const EXAM_POPULATE = { path: 'examIds', select: 'name' }

class AdminShortCategoryService extends BaseService {
  constructor() {
    super(shortCategoryRepository, 'admin:short-category')
  }

  async listAll({ examId, status, page, limit } = {}) {
    const filter = { isDeleted: false }
    if (examId) filter.examIds = examId
    if (status) filter.status = status
    const result = await this.getAll(filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: EXAM_POPULATE
    })

    const [globalTotal, globalActive, globalInactive] = await Promise.all([
      this.repository.count({ isDeleted: false }),
      this.repository.count({ isDeleted: false, status: 'active' }),
      this.repository.count({ isDeleted: false, status: 'inactive' }),
    ])

    result.pagination.globalTotal = globalTotal
    result.pagination.globalActive = globalActive
    result.pagination.globalInactive = globalInactive

    return result
  }

  async getOne(id) {
    const category = await shortCategoryRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: EXAM_POPULATE }
    )
    if (!category) throw new AppError('Short category not found', 404, 'NOT_FOUND')
    return category
  }

  async createCategory(data, files = {}) {
    const payload = { ...data }

    // Arrays might be parsed from string in formData
    if (typeof payload.tags === 'string') {
      try {
        payload.tags = JSON.parse(payload.tags)
      } catch (e) {
        payload.tags = [payload.tags]
      }
    }

    if (!payload.bannerImage && files.bannerImage?.[0]) {
      const v = files.bannerImage[0]
      payload.bannerImage = await uploadFile(v.buffer, `${Date.now()}-banner${path.extname(v.originalname) || '.jpg'}`, 'short-categories/banners', v.mimetype)
    }
    if (!payload.logo && files.logo?.[0]) {
      const t = files.logo[0]
      payload.logo = await uploadFile(t.buffer, `${Date.now()}-logo${path.extname(t.originalname) || '.jpg'}`, 'short-categories/logos', t.mimetype)
    }
    return this.create(payload)
  }

  async updateCategory(id, data, files = {}) {
    const category = await shortCategoryRepository.findOne({ _id: id, isDeleted: false })
    if (!category) throw new AppError('Short category not found', 404, 'NOT_FOUND')

    const payload = { ...data }
    if (typeof payload.tags === 'string') {
      try {
        payload.tags = JSON.parse(payload.tags)
      } catch (e) {
        payload.tags = [payload.tags]
      }
    }

    if (!payload.bannerImage && files.bannerImage?.[0]) {
      const v = files.bannerImage[0]
      payload.bannerImage = await uploadFile(v.buffer, `${Date.now()}-banner${path.extname(v.originalname) || '.jpg'}`, 'short-categories/banners', v.mimetype)
    }
    if (!payload.logo && files.logo?.[0]) {
      const t = files.logo[0]
      payload.logo = await uploadFile(t.buffer, `${Date.now()}-logo${path.extname(t.originalname) || '.jpg'}`, 'short-categories/logos', t.mimetype)
    }
    return shortCategoryRepository.updateById(id, payload)
  }

  async softDelete(id) {
    const category = await shortCategoryRepository.findOne({ _id: id, isDeleted: false })
    if (!category) throw new AppError('Short category not found', 404, 'NOT_FOUND')
    await shortCategoryRepository.updateById(id, { isDeleted: true })
    this.logger.info({ categoryId: id }, 'Short category soft deleted')
  }
}

module.exports = new AdminShortCategoryService()
