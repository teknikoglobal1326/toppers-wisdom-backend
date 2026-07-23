/**
 * BaseRepository — the heart of the reusability pattern.
 *
 * Every module repository extends this class and passes its Mongoose model.
 * All common DB operations are defined ONCE here.
 * Module repositories only add their OWN custom queries.
 *
 * Usage in a module repository:
 *   const BaseRepository = require('../../core/BaseRepository')
 *   const Course = require('../../models/Course.model')
 *
 *   class CourseRepository extends BaseRepository {
 *     constructor() {
 *       super(Course, 'course')  // pass model + module name for logging
 *     }
 *     // add only course-specific queries here
 *   }
 *   module.exports = new CourseRepository()
 *
 * Every method below is then available on every repository instance
 * without writing a single line of extra code.
 */

const { paginate } = require('./paginate')
const { createLogger } = require('../config/logger')

class BaseRepository {
  /**
   * @param {mongoose.Model} model - the Mongoose model for this repository
   * @param {string} moduleName    - used for log context e.g. 'course', 'user'
   */
  constructor(model, moduleName) {
    this.model  = model
    this.logger = createLogger(`${moduleName}:repository`)
  }

  /**
   * Find a single document by its _id.
   * Returns null if not found (does NOT throw — let service decide).
   */
  async findById(id, options = {}) {
    this.logger.debug({ id }, 'findById')
    let query = this.model.findById(id)
    if (options.select)   query = query.select(options.select)
    if (options.populate) query = query.populate(options.populate)
    if (options.lean !== false) query = query.lean()
    return query
  }

  /**
   * Find a single document matching a filter.
   */
  async findOne(filter, options = {}) {
    this.logger.debug({ filter }, 'findOne')
    let query = this.model.findOne(filter)
    if (options.sort)     query = query.sort(options.sort)
    if (options.select)   query = query.select(options.select)
    if (options.populate) query = query.populate(options.populate)
    if (options.lean !== false) query = query.lean()
    return query
  }

  /**
   * Find all documents matching a filter (paginated).
   * Returns { data, pagination }.
   */
  async findMany(filter = {}, options = {}) {
    this.logger.debug({ filter, page: options.page, limit: options.limit }, 'findMany')
    return paginate(this.model, filter, options)
  }

  /**
   * Find all documents with NO pagination (use for small datasets only).
   */
  async findAll(filter = {}, options = {}) {
    this.logger.debug({ filter }, 'findAll')
    let query = this.model.find(filter).sort(options.sort || { createdAt: -1 })
    if (options.select)   query = query.select(options.select)
    if (options.populate) query = query.populate(options.populate)
    if (options.lean !== false) query = query.lean()
    return query
  }

  /**
   * Create a single document.
   */
  async create(data) {
    this.logger.debug({ data }, 'create')
    return this.model.create(data)
  }

  /**
   * Insert multiple documents at once (bulk insert).
   */
  async insertMany(dataArray, options = {}) {
    this.logger.debug({ count: dataArray.length }, 'insertMany')
    return this.model.insertMany(dataArray, options)
  }

  /**
   * Find by id and update. Returns the updated document.
   */
  async updateById(id, data, options = {}) {
    this.logger.debug({ id, fields: Object.keys(data) }, 'updateById')
    return this.model.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true, ...options }
    ).lean()
  }

  /**
   * Find one by filter and update. Returns updated document.
   */
  async updateOne(filter, data, options = {}) {
    this.logger.debug({ filter }, 'updateOne')
    return this.model.findOneAndUpdate(
      filter,
      data,
      { new: true, runValidators: true, ...options }
    ).lean()
  }

  /**
   * Update multiple documents matching a filter.
   */
  async updateMany(filter, data) {
    this.logger.debug({ filter }, 'updateMany')
    return this.model.updateMany(filter, data)
  }

  /**
   * Find by id and delete. Returns the deleted document.
   */
  async deleteById(id) {
    this.logger.debug({ id }, 'deleteById')
    return this.model.findByIdAndDelete(id).lean()
  }

  /**
   * Delete one document matching a filter.
   */
  async deleteOne(filter) {
    this.logger.debug({ filter }, 'deleteOne')
    return this.model.findOneAndDelete(filter).lean()
  }

  /**
   * Delete multiple documents matching a filter.
   */
  async deleteMany(filter) {
    this.logger.debug({ filter }, 'deleteMany')
    return this.model.deleteMany(filter)
  }

  /**
   * Count documents matching a filter.
   */
  async count(filter = {}) {
    this.logger.debug({ filter }, 'count')
    return this.model.countDocuments(filter)
  }

  /**
   * Check if a document exists matching a filter.
   * More efficient than findOne — returns boolean.
   */
  async exists(filter) {
    this.logger.debug({ filter }, 'exists')
    return this.model.exists(filter).then(Boolean)
  }

  /**
   * Run a MongoDB aggregation pipeline.
   */
  async aggregate(pipeline) {
    this.logger.debug({ stages: pipeline.length }, 'aggregate')
    return this.model.aggregate(pipeline)
  }

  /**
   * Find by id or throw AppError 404 if not found.
   * Convenience method — use when missing doc should always be an error.
   */
  async findByIdOrFail(id, message, options = {}) {
    const doc = await this.findById(id, options)
    if (!doc) {
      const AppError = require('./AppError')
      throw new AppError(message || `${this.model.modelName} not found`, 404, 'NOT_FOUND')
    }
    return doc
  }

  /**
   * Find one by filter or throw AppError 404.
   */
  async findOneOrFail(filter, message, options = {}) {
    const doc = await this.findOne(filter, options)
    if (!doc) {
      const AppError = require('./AppError')
      throw new AppError(message || `${this.model.modelName} not found`, 404, 'NOT_FOUND')
    }
    return doc
  }

  /**
   * Upsert — find one and update, or create if not found.
   */
  async upsert(filter, data) {
    this.logger.debug({ filter }, 'upsert')
    return this.model.findOneAndUpdate(
      filter,
      data,
      { new: true, upsert: true, runValidators: true }
    ).lean()
  }

  /**
   * Push an item into an array field of a document.
   * e.g. repo.pushToArray(userId, 'savedItems', { itemId, itemType })
   */
  async pushToArray(id, field, item) {
    this.logger.debug({ id, field }, 'pushToArray')
    return this.model.findByIdAndUpdate(
      id,
      { $push: { [field]: item } },
      { new: true }
    ).lean()
  }

  /**
   * Pull (remove) an item from an array field of a document.
   * e.g. repo.pullFromArray(userId, 'savedItems', { itemId })
   */
  async pullFromArray(id, field, condition) {
    this.logger.debug({ id, field, condition }, 'pullFromArray')
    return this.model.findByIdAndUpdate(
      id,
      { $pull: { [field]: condition } },
      { new: true }
    ).lean()
  }

  /**
   * Increment a numeric field.
   * e.g. repo.increment(courseId, { totalEnrollments: 1 })
   */
  async increment(id, fields) {
    this.logger.debug({ id, fields }, 'increment')
    return this.model.findByIdAndUpdate(
      id,
      { $inc: fields },
      { new: true }
    ).lean()
  }

  /**
   * Decrement a numeric field.
   * e.g. repo.decrement(courseId, { totalEnrollments: 1 })
   */
  async decrement(id, fields) {
    const decrementFields = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, -Math.abs(v)])
    )
    return this.increment(id, decrementFields)
  }

  /**
   * Check if a document with given id exists, throw 404 if not.
   */
  async assertExists(id, message) {
    const exists = await this.exists({ _id: id })
    if (!exists) {
      const AppError = require('./AppError')
      throw new AppError(message || `${this.model.modelName} not found`, 404, 'NOT_FOUND')
    }
  }
}

module.exports = BaseRepository