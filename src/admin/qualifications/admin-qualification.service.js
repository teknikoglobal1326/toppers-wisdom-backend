const BaseService = require('../../core/BaseService')
const qualificationRepository = require('../../modules/qualification/qualification.repository')
const { createLogger } = require('../../config/logger')

class AdminQualificationService extends BaseService {
  constructor() {
    super(qualificationRepository, 'admin:qualification')
    this.logger = createLogger('admin:qualification:service')
  }

  async listAll(query) {
    this.logger.info('Listing all qualifications (admin)')
    return this.getAll(query.filter || {}, {
      page:  parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      sort:  query.sort || { sortOrder: 1, createdAt: -1 },
    })
  }

  async getOne(id) {
    this.logger.info({ id }, 'Get qualification details (admin)')
    return this.repository.findByIdOrFail(id, 'Qualification not found')
  }

  async createQualification(data) {
    this.logger.info({ data }, 'Creating qualification (admin)')
    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    return this.repository.create(data)
  }

  async updateQualification(id, data) {
    this.logger.info({ id, data }, 'Updating qualification (admin)')
    if (data.name) {
      data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }
    await this.repository.assertExists(id, 'Qualification not found')
    return this.repository.updateById(id, data)
  }

  async softDelete(id) {
    this.logger.info({ id }, 'Soft deleting qualification (admin)')
    await this.repository.assertExists(id, 'Qualification not found')
    return this.repository.updateById(id, { isActive: false })
  }
}

module.exports = new AdminQualificationService()
