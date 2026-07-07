const BaseService = require('../../core/BaseService')
const qualificationRepository = require('../../modules/qualification/qualification.repository')
const { createLogger } = require('../../config/logger')
const {
  generateSlug,
  getExactLanguageFilter,
  isDualLanguagePayload,
  makeLanguageRecords,
} = require('../../core/languageUtils')

class AdminQualificationService extends BaseService {
  constructor() {
    super(qualificationRepository, 'admin:qualification')
    this.logger = createLogger('admin:qualification:service')
  }

  async listAll(query) {
    this.logger.info('Listing all qualifications (admin)')
    const filter = { ...(query.filter || {}) }
    if (query.includeDeleted !== 'true') filter.isDelted = false

    return this.getAll(filter, {
      page:  parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      sort:  query.sort || { sortOrder: 1, createdAt: -1 },
    })
  }

  async getOne(id) {
    this.logger.info({ id }, 'Get qualification details (admin)')
    return this.repository.findOneOrFail({ _id: id, isDelted: false }, 'Qualification not found')
  }

  buildPayload(data, { slugSuffix } = {}) {
    const payload = { ...data }
    if (payload.name) payload.slug = generateSlug(payload.name, slugSuffix)
    return payload
  }

  async createQualification(data) {
    this.logger.info({ data }, 'Creating qualification (admin)')
    if (isDualLanguagePayload(data)) {
      return this.repository.insertMany(
        makeLanguageRecords(data).map((record) => this.buildPayload(record, { slugSuffix: record.language }))
      )
    }
    return this.repository.create(this.buildPayload(data))
  }

  async updateQualification(id, data) {
    this.logger.info({ id, data }, 'Updating qualification (admin)')
    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    await this.repository.findOneOrFail({ _id: id, isDelted: false }, 'Qualification not found')
    return this.repository.updateById(id, data)
  }

  async softDelete(id) {
    this.logger.info({ id }, 'Soft deleting qualification (admin)')
    await this.repository.findOneOrFail({ _id: id, isDelted: false }, 'Qualification not found')
    return this.repository.updateById(id, { isDelted: true, isActive: false })
  }
}

module.exports = new AdminQualificationService()
