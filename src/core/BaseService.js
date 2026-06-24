/**
 * BaseService — generic service built on top of BaseRepository.
 *
 * Every module service extends this class.
 * Standard CRUD operations come for FREE — no need to rewrite them.
 *
 * Usage:
 *   const BaseService = require('../../core/BaseService')
 *   const courseRepository = require('./course.repository')
 *
 *   class CourseService extends BaseService {
 *     constructor() {
 *       super(courseRepository, 'course')
 *     }
 *     // only add course-specific logic here
 *     // getAll, getById, create, update, delete are inherited for free
 *   }
 *   module.exports = new CourseService()
 */

const { createLogger } = require('../config/logger')

class BaseService {
  /**
   * @param {BaseRepository} repository - the module's repository instance
   * @param {string} moduleName         - used for log context
   */
  constructor(repository, moduleName) {
    this.repository = repository
    this.logger     = createLogger(`${moduleName}:service`)
  }

  /**
   * Get a paginated list of documents.
   * Override in module service to add filters/transformations.
   */
  async getAll(filter = {}, options = {}) {
    this.logger.info({ filter }, 'getAll')
    return this.repository.findMany(filter, options)
  }

  /**
   * Get a single document by id.
   * Throws 404 automatically if not found.
   */
  async getById(id, options = {}) {
    this.logger.info({ id }, 'getById')
    return this.repository.findByIdOrFail(id, undefined, options)
  }

  /**
   * Create a new document.
   */
  async create(data) {
    this.logger.info({ data }, 'create')
    return this.repository.create(data)
  }

  /**
   * Update a document by id.
   * Throws 404 if not found.
   */
  async update(id, data) {
    this.logger.info({ id, fields: Object.keys(data) }, 'update')
    await this.repository.assertExists(id)
    return this.repository.updateById(id, data)
  }

  /**
   * Delete a document by id.
   * Throws 404 if not found.
   */
  async remove(id) {
    this.logger.info({ id }, 'remove')
    await this.repository.assertExists(id)
    return this.repository.deleteById(id)
  }

  /**
   * Count documents matching a filter.
   */
  async count(filter = {}) {
    return this.repository.count(filter)
  }

  /**
   * Check existence.
   */
  async exists(filter) {
    return this.repository.exists(filter)
  }
}

module.exports = BaseService