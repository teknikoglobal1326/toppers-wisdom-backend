# Claude Code Prompt — Toppers Wisdom API (Node.js + MongoDB)
# Architecture: Maximum Reusability Pattern

> Paste this into Claude Code in VS Code.

---

## Core philosophy

Write once, use everywhere. The entire API is built on 4 reusable foundations:

1. **BaseRepository** — one class with all DB methods. Every module repository extends it. Never write `Model.find()`, `Model.findById()` etc. directly again.
2. **BaseService** — one class with common service logic. Every module service extends it and gets CRUD for free.
3. **catchAsync** — one wrapper that eliminates try/catch from every controller function.
4. **sendSuccess / sendError** — one global response helper used in every controller.

---

## Tech stack

- Node.js + Express (CommonJS — `require` / `module.exports` everywhere, no TypeScript, no ES modules)
- MongoDB + Mongoose
- Redis (ioredis)
- JWT auth (OTP-based, no passwords)
- Joi (request validation)
- BullMQ (background jobs)
- Pino (structured logging with module-wise child loggers)

---

## Folder structure

```
toppers-wisdom-api/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── storage.js
│   │   └── logger.js
│   │
│   ├── core/                        ← ALL REUSABLE BASE CLASSES LIVE HERE
│   │   ├── BaseRepository.js        ← generic DB methods for every model
│   │   ├── BaseService.js           ← generic business logic built on BaseRepository
│   │   ├── catchAsync.js            ← eliminates try/catch from all controllers
│   │   ├── response.js              ← global sendSuccess / sendError
│   │   ├── AppError.js              ← custom error class
│   │   ├── validate.js              ← Joi validation middleware factory
│   │   └── paginate.js              ← pagination helper
│   │
│   ├── models/
│   │   ├── User.model.js
│   │   ├── Qualification.model.js
│   │   ├── ExamType.model.js
│   │   ├── SubExam.model.js
│   │   ├── Course.model.js
│   │   ├── Test.model.js
│   │   ├── Booster.model.js
│   │   ├── Enrollment.model.js
│   │   ├── TestAttempt.model.js
│   │   ├── Order.model.js
│   │   ├── Blog.model.js
│   │   └── Notification.model.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.repository.js
│   │   │   └── auth.schema.js
│   │   ├── user/
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   ├── user.repository.js
│   │   │   └── user.schema.js
│   │   ├── course/
│   │   │   ├── course.routes.js
│   │   │   ├── course.controller.js
│   │   │   ├── course.service.js
│   │   │   ├── course.repository.js
│   │   │   └── course.schema.js
│   │   ├── test/
│   │   │   ├── test.routes.js
│   │   │   ├── test.controller.js
│   │   │   ├── test.service.js
│   │   │   ├── test.repository.js
│   │   │   └── test.schema.js
│   │   ├── booster/
│   │   │   ├── booster.routes.js
│   │   │   ├── booster.controller.js
│   │   │   ├── booster.service.js
│   │   │   ├── booster.repository.js
│   │   │   └── booster.schema.js
│   │   ├── payment/
│   │   │   ├── payment.routes.js
│   │   │   ├── payment.controller.js
│   │   │   ├── payment.service.js
│   │   │   ├── payment.repository.js
│   │   │   └── payment.schema.js
│   │   ├── blog/
│   │   │   ├── blog.routes.js
│   │   │   ├── blog.controller.js
│   │   │   ├── blog.service.js
│   │   │   └── blog.repository.js
│   │   ├── progress/
│   │   │   ├── progress.routes.js
│   │   │   ├── progress.controller.js
│   │   │   ├── progress.service.js
│   │   │   └── progress.repository.js
│   │   └── qualification/
│   │       ├── qualification.routes.js
│   │       ├── qualification.controller.js
│   │       ├── qualification.service.js
│   │       └── qualification.repository.js
│   │
│   ├── admin/
│   │   ├── admin.router.js
│   │   ├── courses/
│   │   │   ├── admin-course.routes.js
│   │   │   ├── admin-course.controller.js
│   │   │   └── admin-course.service.js
│   │   ├── tests/
│   │   │   ├── admin-test.routes.js
│   │   │   ├── admin-test.controller.js
│   │   │   └── admin-test.service.js
│   │   ├── boosters/
│   │   │   ├── admin-booster.routes.js
│   │   │   └── admin-booster.controller.js
│   │   ├── users/
│   │   │   ├── admin-user.routes.js
│   │   │   └── admin-user.controller.js
│   │   ├── blog/
│   │   │   ├── admin-blog.routes.js
│   │   │   └── admin-blog.controller.js
│   │   ├── analytics/
│   │   │   ├── admin-analytics.routes.js
│   │   │   ├── admin-analytics.controller.js
│   │   │   └── admin-analytics.service.js
│   │   └── notifications/
│   │       ├── admin-notification.routes.js
│   │       └── admin-notification.controller.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── admin.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   ├── language.middleware.js
│   │   └── errorHandler.middleware.js
│   │
│   ├── jobs/
│   │   ├── queue.js
│   │   └── workers/
│   │       ├── rank.worker.js
│   │       ├── notification.worker.js
│   │       └── email.worker.js
│   │
│   ├── lib/
│   │   ├── jwt.js
│   │   ├── otp.js
│   │   ├── access.js
│   │   ├── sms.js
│   │   └── s3.js
│   │
│   ├── seeds/
│   │   └── seed.js
│   │
│   ├── app.js
│   └── server.js
│
├── logs/
├── .env.example
├── .eslintrc.js
├── .gitignore
├── nodemon.json
├── package.json
├── docker-compose.yml
└── README.md
```

---

## ═══════════════════════════════════════════
## CORE LAYER — write once, used by everything
## ═══════════════════════════════════════════

### src/core/AppError.js

```js
/**
 * Custom operational error class.
 * Throw this anywhere in services/repositories for known failures.
 * The global error handler catches it and sends the right HTTP response.
 *
 * Usage:
 *   throw new AppError('Course not found', 404)
 *   throw new AppError('Invalid OTP', 400, 'INVALID_OTP')
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode  = statusCode
    this.code        = code
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}

module.exports = AppError
```

---

### src/core/catchAsync.js

```js
/**
 * Wraps any async Express route handler and forwards errors to next().
 * Eliminates try/catch from EVERY controller function.
 *
 * Before (without catchAsync):
 *   const getMe = async (req, res, next) => {
 *     try {
 *       const user = await userService.getMe(req.user._id)
 *       sendSuccess(res, user)
 *     } catch (err) {
 *       next(err)   // must repeat this in every function
 *     }
 *   }
 *
 * After (with catchAsync):
 *   const getMe = catchAsync(async (req, res) => {
 *     const user = await userService.getMe(req.user._id)
 *     sendSuccess(res, user)
 *   })
 *
 * Usage: wrap every controller function with catchAsync.
 * Any thrown error (AppError or unexpected) is automatically forwarded to errorHandler.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = catchAsync
```

---

### src/core/response.js

```js
/**
 * Global response helpers — used in every controller.
 * Never write res.status().json() directly. Always use these.
 *
 * Ensures every API response has the same shape:
 *   Success: { success: true,  message, data }
 *   Error:   { success: false, error: { code, message } }
 *   List:    { success: true,  message, data, pagination }
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  })
}

const sendCreated = (res, data, message = 'Created successfully') => {
  sendSuccess(res, data, message, 201)
}

const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination,
  })
}

const sendError = (res, message = 'Something went wrong', statusCode = 500, code = 'INTERNAL_ERROR') => {
  res.status(statusCode).json({
    success: false,
    error: { code, message },
  })
}

const sendNoContent = (res) => res.status(204).send()

module.exports = { sendSuccess, sendCreated, sendPaginated, sendError, sendNoContent }
```

---

### src/core/paginate.js

```js
/**
 * Reusable pagination helper.
 * Used by BaseRepository.findMany() — never called directly in services.
 *
 * @param {mongoose.Model} model
 * @param {object} filter      - mongoose filter query
 * @param {object} options     - { page, limit, sort, select, populate }
 * @returns {{ data, pagination }}
 */
const paginate = async (model, filter = {}, options = {}) => {
  const page  = Math.max(1, parseInt(options.page)  || 1)
  const limit = Math.min(100, parseInt(options.limit) || 10)
  const sort  = options.sort || { createdAt: -1 }
  const skip  = (page - 1) * limit

  let query = model.find(filter).sort(sort).skip(skip).limit(limit).lean()
  if (options.select)   query = query.select(options.select)
  if (options.populate) query = query.populate(options.populate)

  const [data, total] = await Promise.all([query, model.countDocuments(filter)])

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    },
  }
}

module.exports = { paginate }
```

---

### src/core/validate.js

```js
/**
 * Joi validation middleware factory.
 * Usage: router.post('/route', validate(joiSchema), controller.fn)
 *
 * Validates req.body, strips unknown fields, returns 400 on failure.
 * All validation errors are joined into one readable message.
 */
const AppError = require('./AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:validate')

const validate = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,    // collect ALL errors, not just the first
    stripUnknown: true,   // remove fields not in schema
    convert: true,        // auto-convert types (string "true" → boolean true)
  })

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ')
    logger.warn({ path: req.path, errors: messages }, 'Validation failed')
    return next(new AppError(messages, 400, 'VALIDATION_ERROR'))
  }

  req.body = value  // replace with cleaned, converted data
  next()
}

/**
 * Validate query params instead of body.
 * Usage: router.get('/route', validateQuery(schema), controller.fn)
 */
const validateQuery = (schema) => (req, _res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  })

  if (error) {
    const messages = error.details.map((d) => d.message).join(', ')
    return next(new AppError(messages, 400, 'VALIDATION_ERROR'))
  }

  req.query = value
  next()
}

module.exports = { validate, validateQuery }
```

---

### src/core/BaseRepository.js

```js
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
```

---

### src/core/BaseService.js

```js
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
```

---

## ══════════════════════════════
## CONFIG LAYER
## ══════════════════════════════

### src/config/logger.js

```js
const pino  = require('pino')
const path  = require('path')
const config = require('./env')

const targets = [
  {
    target: config.NODE_ENV !== 'production' ? 'pino-pretty' : 'pino/file',
    options: config.NODE_ENV !== 'production'
      ? { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' }
      : { destination: 1 },
    level: 'debug',
  },
]

if (config.NODE_ENV === 'production') {
  targets.push(
    { target: 'pino/file', options: { destination: path.join(process.cwd(), 'logs', 'app.log'),   mkdir: true }, level: 'info'  },
    { target: 'pino/file', options: { destination: path.join(process.cwd(), 'logs', 'error.log'), mkdir: true }, level: 'error' }
  )
}

const rootLogger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  base: { env: config.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: { targets },
})

/**
 * Creates a child logger with a module context field.
 * Every log line will include { module: 'moduleName' }.
 *
 * Usage:
 *   const logger = createLogger('course:service')
 *   logger.info({ courseId }, 'Course fetched')
 *   // → { module: 'course:service', courseId: '...', msg: 'Course fetched' }
 */
const createLogger = (moduleName) => rootLogger.child({ module: moduleName })

module.exports = { rootLogger, createLogger }
```

---

### src/config/env.js

```js
const Joi = require('joi')
require('dotenv').config()

const schema = Joi.object({
  NODE_ENV:               Joi.string().valid('development', 'production', 'test').default('development'),
  PORT:                   Joi.number().default(3000),
  MONGODB_URI:            Joi.string().required(),
  REDIS_URL:              Joi.string().required(),
  JWT_ACCESS_SECRET:      Joi.string().min(32).required(),
  JWT_REFRESH_SECRET:     Joi.string().min(32).required(),
  MSG91_AUTH_KEY:         Joi.string().required(),
  MSG91_TEMPLATE_ID:      Joi.string().required(),
  AWS_ACCESS_KEY_ID:      Joi.string().required(),
  AWS_SECRET_ACCESS_KEY:  Joi.string().required(),
  AWS_REGION:             Joi.string().default('ap-south-1'),
  AWS_S3_BUCKET:          Joi.string().required(),
  RAZORPAY_KEY_ID:        Joi.string().required(),
  RAZORPAY_KEY_SECRET:    Joi.string().required(),
  OPENAI_API_KEY:         Joi.string().required(),
  FCM_SERVICE_ACCOUNT_JSON: Joi.string().required(),
  ADMIN_PHONE:            Joi.string().required(),
  ALLOWED_ORIGINS:        Joi.string().default('http://localhost:3001'),
}).unknown()

const { error, value } = schema.validate(process.env)
if (error) throw new Error(`Config validation error: ${error.message}`)

module.exports = Object.freeze(value)
```

---

### src/config/database.js

```js
const mongoose = require('mongoose')
const config   = require('./env')
const { createLogger } = require('./logger')

const logger = createLogger('database')

const connectDB = async () => {
  await mongoose.connect(config.MONGODB_URI)
  logger.info('MongoDB connected')
}

mongoose.connection.on('error',        (err) => logger.error({ err }, 'MongoDB error'))
mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'))
mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'))

module.exports = { connectDB }
```

---

### src/config/redis.js

```js
const Redis  = require('ioredis')
const config = require('./env')
const { createLogger } = require('./logger')

const logger = createLogger('redis')

const redis = new Redis(config.REDIS_URL, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 3,
})

redis.on('connect',      ()    => logger.info('Redis connected'))
redis.on('error',        (err) => logger.error({ err }, 'Redis error'))
redis.on('reconnecting', ()    => logger.warn('Redis reconnecting'))

module.exports = redis
```

---

### src/config/storage.js

```js
const { S3Client } = require('@aws-sdk/client-s3')
const config = require('./env')

const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId:     config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
})

module.exports = { s3, bucket: config.AWS_S3_BUCKET }
```

---

## ══════════════════════════════
## MODELS
## ══════════════════════════════

### src/models/User.model.js

```js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  phone:           { type: String, required: true, unique: true, index: true },
  name:            { type: String, trim: true },
  email:           { type: String, trim: true, lowercase: true },
  language:        { type: String, enum: ['hi', 'en'], default: 'hi' },
  role:            { type: String, enum: ['user', 'admin'], default: 'user', index: true },
  profileComplete: { type: Boolean, default: false },
  qualification:   { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Qualification' }, name: String },
  examType:        { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType'      }, name: String },
  subExam:         { _id: { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam'       }, name: String },
  avatar:          String,
  fcmToken:        String,
  savedItems: [{
    itemType: String,
    itemId:   mongoose.Schema.Types.ObjectId,
    savedAt:  { type: Date, default: Date.now },
  }],
  reportedItems: [{
    itemType:   String,
    itemId:     mongoose.Schema.Types.ObjectId,
    reason:     String,
    reportedAt: { type: Date, default: Date.now },
  }],
  watchDuration: { type: Number, default: 0 },
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
```

### src/models/Qualification.model.js

```js
const mongoose = require('mongoose')
const s = new mongoose.Schema({
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('Qualification', s)
```

### src/models/ExamType.model.js

```js
const mongoose = require('mongoose')
const s = new mongoose.Schema({
  qualification: { type: mongoose.Schema.Types.ObjectId, ref: 'Qualification', required: true, index: true },
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  icon: String, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('ExamType', s)
```

### src/models/SubExam.model.js

```js
const mongoose = require('mongoose')
const s = new mongoose.Schema({
  examType: { type: mongoose.Schema.Types.ObjectId, ref: 'ExamType', required: true, index: true },
  name: { type: String, required: true }, slug: { type: String, required: true, unique: true },
  icon: String, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 },
}, { timestamps: true })
module.exports = mongoose.model('SubExam', s)
```

### src/models/Course.model.js

```js
const mongoose = require('mongoose')

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type:  { type: String, enum: ['video', 'pdf', 'quiz'], required: true },
  subject:   String,
  videoKey:  String,
  pdfKey:    String,
  duration:  { type: Number, default: 0 },
  isPreview: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },
  language:  { type: String, enum: ['hi', 'en'], default: 'hi' },
})

const courseSchema = new mongoose.Schema({
  subExam:    { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', required: true, index: true },
  title:      { type: String, required: true },
  slug:       { type: String, required: true, unique: true },
  description: String,
  language:   { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  type:       { type: String, enum: ['recorded', 'live', 'free'], required: true, index: true },
  price:      { type: Number, default: 0 },
  isFree:     { type: Boolean, default: false, index: true },
  thumbnail:  String,
  instructor: { name: String, avatar: String, bio: String },
  status:     { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  subjects:   [{ name: String, sortOrder: { type: Number, default: 0 } }],
  lessons:    [lessonSchema],
  tests:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Test' }],
  avgRating:        { type: Number, default: 0 },
  totalReviews:     { type: Number, default: 0 },
  totalEnrollments: { type: Number, default: 0 },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

courseSchema.index({ subExam: 1, status: 1, isFree: 1 })
module.exports = mongoose.model('Course', courseSchema)
```

### src/models/Test.model.js

```js
const mongoose = require('mongoose')

const questionSchema = new mongoose.Schema({
  questionText:  { type: String, required: true },
  options:       { type: [String], required: true },
  correctOption: { type: Number, required: true, min: 0, max: 3 },
  marks:         { type: Number, default: 1 },
  negativeMarks: { type: Number, default: 0.25 },
  explanation:   String,
  language:      { type: String, enum: ['hi', 'en'], default: 'hi' },
  imageKey:      String,
})

const subTestSchema = new mongoose.Schema({
  title: { type: String, required: true }, totalMarks: Number, duration: Number,
  questions: [questionSchema],
})

const testSchema = new mongoose.Schema({
  subExam:         { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', required: true, index: true },
  course:          { type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: null },
  title:           { type: String, required: true },
  type:            { type: String, enum: ['practice','mock','pyp','sectional','ai_generated','daily_quiz'], required: true, index: true },
  language:        { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  isFree:          { type: Boolean, default: false, index: true },
  price:           { type: Number, default: 0 },
  status:          { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  totalMarks:      Number,
  duration:        Number,
  negativeMarking: { type: Boolean, default: false },
  negativeMarks:   { type: Number, default: 0.25 },
  subTests:        [subTestSchema],
  createdBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Test', testSchema)
```

### src/models/Booster.model.js

```js
const mongoose = require('mongoose')

const boosterSchema = new mongoose.Schema({
  subExam:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubExam', index: true },
  type:     { type: String, enum: ['pyp_dictionary', 'editorial', 'grammar'], required: true, index: true },
  title:    { type: String, required: true },
  language: { type: String, enum: ['hi', 'en', 'both'], default: 'hi' },
  isActive: { type: Boolean, default: true, index: true },
  items: [{
    title:       { type: String, required: true },
    contentType: { type: String, enum: ['word', 'article', 'topic'], required: true },
    audioKey: String, pdfKey: String, content: String,
    isFree: { type: Boolean, default: false },
    subItems: [{ title: String, pdfKey: String, testRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Test' } }],
    sortOrder: { type: Number, default: 0 },
  }],
}, { timestamps: true })

module.exports = mongoose.model('Booster', boosterSchema)
```

### src/models/Enrollment.model.js

```js
const mongoose = require('mongoose')

const enrollmentSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress: [{
    lessonId:       mongoose.Schema.Types.ObjectId,
    completed:      { type: Boolean, default: false },
    watchedSeconds: { type: Number, default: 0 },
    completedAt:    Date,
  }],
  progressPercent: { type: Number, default: 0 },
  enrolledAt:  { type: Date, default: Date.now },
  completedAt: Date,
  expiresAt:   Date,
}, { timestamps: true })

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })
module.exports = mongoose.model('Enrollment', enrollmentSchema)
```

### src/models/TestAttempt.model.js

```js
const mongoose = require('mongoose')

const testAttemptSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  test:        { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true, index: true },
  subTestId:   mongoose.Schema.Types.ObjectId,
  answers:     [{ questionId: mongoose.Schema.Types.ObjectId, selectedOption: Number }],
  score:       { type: Number, default: 0 },
  totalMarks:  Number,
  accuracy:    { type: Number, default: 0 },
  timeTaken:   Number,
  rank:        Number,
  correct:     { type: Number, default: 0 },
  wrong:       { type: Number, default: 0 },
  unattempted: { type: Number, default: 0 },
  status:      { type: String, enum: ['completed', 'abandoned'], default: 'completed' },
  attemptedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true })

module.exports = mongoose.model('TestAttempt', testAttemptSchema)
```

### src/models/Order.model.js

```js
const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  items: [{
    itemType: { type: String, enum: ['course', 'test', 'booster'], required: true },
    itemId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    title: String, price: Number,
  }],
  totalAmount:       { type: Number, required: true },
  currency:          { type: String, default: 'INR' },
  status:            { type: String, enum: ['pending','paid','failed','refunded'], default: 'pending', index: true },
  razorpayOrderId:   { type: String, index: true },
  razorpayPaymentId: String,
  razorpaySignature: String,
  paidAt:            Date,
}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
```

### src/models/Blog.model.js

```js
const mongoose = require('mongoose')

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true }, slug: { type: String, required: true, unique: true, index: true },
  content: { type: String, required: true }, excerpt: String, thumbnail: String,
  author: { name: String, avatar: String },
  category: { type: String, index: true }, tags: [String],
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  publishedAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

module.exports = mongoose.model('Blog', blogSchema)
```

### src/models/Notification.model.js

```js
const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title:  { type: String, required: true }, body: { type: String, required: true },
  type:   { type: String, enum: ['course', 'test', 'payment', 'system'], required: true },
  isRead: { type: Boolean, default: false },
  data:   mongoose.Schema.Types.Mixed,
}, { timestamps: true })

notificationSchema.index({ user: 1, isRead: 1 })
module.exports = mongoose.model('Notification', notificationSchema)
```

---

## ══════════════════════════════
## AUTH MODULE — full example showing the pattern
## ══════════════════════════════

### src/modules/auth/auth.repository.js

```js
/**
 * AuthRepository extends BaseRepository.
 * Gets findById, findOne, create, updateById, etc. for FREE.
 * Only adds auth-specific queries here.
 */
const BaseRepository = require('../../core/BaseRepository')
const User = require('../../models/User.model')

class AuthRepository extends BaseRepository {
  constructor() {
    super(User, 'auth')  // passes User model + 'auth' for logger context
  }

  // findByPhone is auth-specific — add it here
  async findByPhone(phone) {
    return this.findOne({ phone })  // uses BaseRepository.findOne
  }

  // findByPhone or create — upsert pattern
  async findOrCreate(phone) {
    return this.upsert({ phone }, { $setOnInsert: { phone, role: 'user' } })
  }
}

module.exports = new AuthRepository()
```

---

### src/modules/auth/auth.service.js

```js
const authRepository = require('./auth.repository')
const { generateOtp, storeOtp, verifyOtp, checkRateLimit } = require('../../lib/otp')
const { sendOtpSms }  = require('../../lib/sms')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../lib/jwt')
const AppError = require('../../core/AppError')
const redis    = require('../../config/redis')
const { createLogger } = require('../../config/logger')

const logger = createLogger('auth:service')

const sendOtp = async (phone) => {
  logger.info({ phone }, 'OTP send requested')
  await checkRateLimit(phone)
  const otp = generateOtp()
  await storeOtp(phone, otp)
  await sendOtpSms(phone, otp)
  logger.info({ phone }, 'OTP sent')
  return { message: 'OTP sent successfully' }
}

const verifyOtpAndLogin = async (phone, otp) => {
  logger.info({ phone }, 'Login attempt')
  await verifyOtp(phone, otp)

  let user = await authRepository.findByPhone(phone)
  const isNewUser = !user

  if (isNewUser) {
    user = await authRepository.create({ phone, role: 'user' })
    logger.info({ phone, userId: user._id }, 'New user registered')
  } else {
    logger.info({ phone, userId: user._id }, 'Existing user logged in')
  }

  const payload      = { _id: user._id, phone: user.phone, role: user.role, subExamId: user.subExam?._id || null }
  const accessToken  = signAccessToken(payload)
  const refreshToken = signRefreshToken({ _id: user._id })

  return { accessToken, refreshToken, user, isNewUser }
}

const refreshToken = async (token) => {
  const payload = verifyRefreshToken(token)
  // uses BaseRepository.findByIdOrFail — throws 401 if not found
  const user = await authRepository.findByIdOrFail(payload._id, 'User not found')
  const accessToken = signAccessToken({ _id: user._id, phone: user.phone, role: user.role, subExamId: user.subExam?._id || null })
  logger.info({ userId: user._id }, 'Token refreshed')
  return { accessToken }
}

const logout = async (token) => {
  const decoded = require('jsonwebtoken').decode(token)
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
  }
  logger.info({ userId: decoded?._id }, 'User logged out')
}

module.exports = { sendOtp, verifyOtpAndLogin, refreshToken, logout }
```

---

### src/modules/auth/auth.controller.js

```js
/**
 * Controllers are now 3 lines each.
 * catchAsync  — eliminates try/catch
 * sendSuccess — standardized response
 * No business logic. No error handling. Just call service and respond.
 */
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const authService = require('./auth.service')

const sendOtp = catchAsync(async (req, res) => {
  const data = await authService.sendOtp(req.body.phone)
  sendSuccess(res, data)
})

const verifyOtp = catchAsync(async (req, res) => {
  const data = await authService.verifyOtpAndLogin(req.body.phone, req.body.otp)
  sendSuccess(res, data, 'Login successful')
})

const refreshToken = catchAsync(async (req, res) => {
  const data = await authService.refreshToken(req.body.refreshToken)
  sendSuccess(res, data)
})

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.token)
  sendSuccess(res, null, 'Logged out successfully')
})

module.exports = { sendOtp, verifyOtp, refreshToken, logout }
```

---

### src/modules/auth/auth.schema.js

```js
const Joi = require('joi')

const sendOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required()
    .messages({ 'string.pattern.base': 'Provide a valid 10-digit Indian mobile number' }),
})

const verifyOtpSchema = Joi.object({
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).required(),
  otp:   Joi.string().length(6).pattern(/^\d+$/).required(),
})

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
})

module.exports = { sendOtpSchema, verifyOtpSchema, refreshTokenSchema }
```

---

### src/modules/auth/auth.routes.js

```js
const router = require('express').Router()
const controller = require('./auth.controller')
const { validate }        = require('../../core/validate')
const { authMiddleware }  = require('../../middlewares/auth.middleware')
const { otpLimiter }      = require('../../middlewares/rateLimiter.middleware')
const { sendOtpSchema, verifyOtpSchema, refreshTokenSchema } = require('./auth.schema')

router.post('/send-otp',     otpLimiter, validate(sendOtpSchema),     controller.sendOtp)
router.post('/verify-otp',              validate(verifyOtpSchema),    controller.verifyOtp)
router.post('/refresh-token',           validate(refreshTokenSchema), controller.refreshToken)
router.post('/logout',       authMiddleware,                          controller.logout)

module.exports = router
```

---

## ══════════════════════════════
## USER MODULE — shows BaseService inheritance
## ══════════════════════════════

### src/modules/user/user.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const User = require('../../models/User.model')

class UserRepository extends BaseRepository {
  constructor() {
    super(User, 'user')
  }

  // Only user-specific queries here. Everything else comes from BaseRepository.

  async findByPhone(phone) {
    return this.findOne({ phone })
  }

  async updateSubExam(userId, qualification, examType, subExam) {
    return this.updateById(userId, {
      qualification: { _id: qualification._id, name: qualification.name },
      examType:      { _id: examType._id,      name: examType.name },
      subExam:       { _id: subExam._id,        name: subExam.name },
      profileComplete: true,
    })
  }

  async getSavedItems(userId) {
    const user = await this.findById(userId, { select: 'savedItems' })
    return user?.savedItems || []
  }

  async addSavedItem(userId, item) {
    return this.pushToArray(userId, 'savedItems', item)   // BaseRepository.pushToArray
  }

  async removeSavedItem(userId, itemId) {
    return this.pullFromArray(userId, 'savedItems', { itemId })  // BaseRepository.pullFromArray
  }

  async addWatchDuration(userId, seconds) {
    return this.increment(userId, { watchDuration: seconds })   // BaseRepository.increment
  }
}

module.exports = new UserRepository()
```

---

### src/modules/user/user.service.js

```js
/**
 * UserService extends BaseService.
 * getById, update, count are inherited for FREE.
 * Only user-specific logic added here.
 */
const BaseService  = require('../../core/BaseService')
const userRepository = require('./user.repository')
const Qualification  = require('../../models/Qualification.model')
const ExamType       = require('../../models/ExamType.model')
const SubExam        = require('../../models/SubExam.model')
const Order          = require('../../models/Order.model')
const Notification   = require('../../models/Notification.model')
const TestAttempt    = require('../../models/TestAttempt.model')
const Enrollment     = require('../../models/Enrollment.model')
const AppError  = require('../../core/AppError')
const { paginate }   = require('../../core/paginate')
const { createLogger } = require('../../config/logger')

class UserService extends BaseService {
  constructor() {
    super(userRepository, 'user')
    this.logger = createLogger('user:service')
  }

  async getMe(userId) {
    this.logger.info({ userId }, 'Fetching profile')
    // inherited: this.getById() calls findByIdOrFail → throws 404 automatically
    return this.getById(userId)
  }

  async updateProfile(userId, data) {
    this.logger.info({ userId, fields: Object.keys(data) }, 'Updating profile')
    // inherited: this.update() checks existence then calls updateById
    return this.update(userId, data)
  }

  async setupProfile(userId, data) {
    this.logger.info({ userId }, 'Profile setup')

    const [qualification, examType, subExam] = await Promise.all([
      Qualification.findById(data.qualificationId).lean(),
      ExamType.findById(data.examTypeId).lean(),
      SubExam.findById(data.subExamId).lean(),
    ])

    if (!qualification) throw new AppError('Qualification not found', 404)
    if (!examType)      throw new AppError('Exam type not found', 404)
    if (!subExam)       throw new AppError('Sub-exam not found', 404)

    const user = await userRepository.updateSubExam(userId, qualification, examType, subExam)
    this.logger.info({ userId, subExam: subExam.name }, 'Profile setup complete')
    return user
  }

  async getStats(userId) {
    this.logger.info({ userId }, 'Fetching stats')
    const [user, testAttempts, enrollments] = await Promise.all([
      userRepository.findById(userId, { select: 'watchDuration savedItems' }),
      TestAttempt.countDocuments({ user: userId }),
      Enrollment.countDocuments({ user: userId }),
    ])
    return { watchDuration: user?.watchDuration || 0, savedCount: user?.savedItems?.length || 0, testAttempts, enrollments }
  }

  async getSaved(userId, opts) {
    const items = await userRepository.getSavedItems(userId)
    const page  = Math.max(1, parseInt(opts.page) || 1)
    const limit = Math.min(50, parseInt(opts.limit) || 10)
    const data  = items.slice((page - 1) * limit, page * limit)
    return { data, pagination: { page, limit, total: items.length, totalPages: Math.ceil(items.length / limit) } }
  }

  async removeSaved(userId, itemId) {
    this.logger.info({ userId, itemId }, 'Removing saved item')
    return userRepository.removeSavedItem(userId, itemId)
  }

  async getOrders(userId, opts) {
    return paginate(Order, { user: userId }, { ...opts, sort: { createdAt: -1 } })
  }

  async getNotifications(userId, opts) {
    return paginate(Notification, { user: userId }, { ...opts, sort: { createdAt: -1 } })
  }

  async markNotificationRead(userId, notifId) {
    return Notification.findOneAndUpdate({ _id: notifId, user: userId }, { isRead: true })
  }

  async updateFcmToken(userId, fcmToken) {
    return userRepository.updateById(userId, { fcmToken })
  }
}

module.exports = new UserService()
```

---

### src/modules/user/user.controller.js

```js
/**
 * EVERY function is 3 lines:
 * 1. catchAsync wrapper — no try/catch needed
 * 2. call service
 * 3. send response
 */
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const userService = require('./user.service')

const getMe            = catchAsync(async (req, res) => { sendSuccess(res, await userService.getMe(req.user._id)) })
const updateProfile    = catchAsync(async (req, res) => { sendSuccess(res, await userService.updateProfile(req.user._id, req.body)) })
const setupProfile     = catchAsync(async (req, res) => { sendSuccess(res, await userService.setupProfile(req.user._id, req.body), 'Profile setup complete') })
const getStats         = catchAsync(async (req, res) => { sendSuccess(res, await userService.getStats(req.user._id)) })
const removeSaved      = catchAsync(async (req, res) => { await userService.removeSaved(req.user._id, req.params.itemId); sendSuccess(res, null, 'Removed') })
const markNotifRead    = catchAsync(async (req, res) => { await userService.markNotificationRead(req.user._id, req.params.id); sendSuccess(res, null, 'Marked as read') })
const updateFcmToken   = catchAsync(async (req, res) => { await userService.updateFcmToken(req.user._id, req.body.fcmToken); sendSuccess(res, null, 'Updated') })

const getSaved         = catchAsync(async (req, res) => {
  const r = await userService.getSaved(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getOrders        = catchAsync(async (req, res) => {
  const r = await userService.getOrders(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

const getNotifications = catchAsync(async (req, res) => {
  const r = await userService.getNotifications(req.user._id, req.query)
  sendPaginated(res, r.data, r.pagination)
})

module.exports = { getMe, updateProfile, setupProfile, getStats, getSaved, removeSaved, getOrders, getNotifications, markNotifRead, updateFcmToken }
```

---

## ══════════════════════════════
## COURSE MODULE — shows full BaseRepository usage
## ══════════════════════════════

### src/modules/course/course.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Course     = require('../../models/Course.model')
const Enrollment = require('../../models/Enrollment.model')

class CourseRepository extends BaseRepository {
  constructor() {
    super(Course, 'course')
  }

  // Enrollment queries are course-specific — add them here
  async findEnrollment(userId, courseId) {
    return Enrollment.findOne({ user: userId, course: courseId }).lean()
  }

  async createEnrollment(userId, courseId) {
    return Enrollment.create({ user: userId, course: courseId })
  }

  async addLesson(courseId, lesson) {
    return this.pushToArray(courseId, 'lessons', lesson)  // BaseRepository.pushToArray
  }

  async removeLesson(courseId, lessonId) {
    return this.pullFromArray(courseId, 'lessons', { _id: lessonId })  // BaseRepository.pullFromArray
  }

  async updateLesson(courseId, lessonId, data) {
    return this.model.findOneAndUpdate(
      { _id: courseId, 'lessons._id': lessonId },
      { $set: { 'lessons.$': { ...data, _id: lessonId } } },
      { new: true }
    ).lean()
  }

  async incrementEnrollments(courseId) {
    return this.increment(courseId, { totalEnrollments: 1 })  // BaseRepository.increment
  }

  async updateRating(courseId, avgRating, totalReviews) {
    return this.updateById(courseId, { avgRating, totalReviews })  // BaseRepository.updateById
  }
}

module.exports = new CourseRepository()
```

---

### src/modules/course/course.service.js

```js
const BaseService    = require('../../core/BaseService')
const courseRepository = require('./course.repository')
const { checkAccess }  = require('../../lib/access')
const { getPresignedDownloadUrl } = require('../../lib/s3')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class CourseService extends BaseService {
  constructor() {
    super(courseRepository, 'course')
    this.logger = createLogger('course:service')
  }

  async listCourses(userId, subExamId, filters, lang) {
    this.logger.info({ userId, subExamId }, 'Listing courses')

    const filter = { subExam: subExamId, status: 'published' }
    if (filters.type)              filter.type   = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    if (lang && lang !== 'both')  filter.language = { $in: [lang, 'both'] }

    // inherited: this.getAll() calls findMany (paginated)
    const result = await this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      select: 'title slug thumbnail type price isFree avgRating totalEnrollments instructor.name language',
    })

    // Attach hasAccess flag to each course
    result.data = await Promise.all(result.data.map(async (course) => ({
      ...course,
      hasAccess: course.isFree || await checkAccess(userId, 'course', course._id),
    })))

    return result
  }

  async getCourse(courseId, userId) {
    this.logger.info({ courseId, userId }, 'Fetching course detail')
    // inherited: this.getById() throws 404 automatically if not found
    const course    = await this.getById(courseId)
    const hasAccess = course.isFree || await checkAccess(userId, 'course', courseId)

    if (!hasAccess) {
      course.lessons = course.lessons.map((l) =>
        l.isPreview ? l : { ...l, videoKey: undefined, pdfKey: undefined }
      )
    }

    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    return { ...course, hasAccess, enrollmentProgress: enrollment?.progressPercent || 0 }
  }

  async getVideoUrl(courseId, lessonId, userId) {
    const enrollment = await courseRepository.findEnrollment(userId, courseId)
    if (!enrollment) throw new AppError('You are not enrolled in this course', 403, 'FORBIDDEN')

    const course = await this.getById(courseId)
    const lesson = course.lessons.find((l) => l._id.toString() === lessonId)
    if (!lesson?.videoKey) throw new AppError('Video not available for this lesson', 404)

    const url = await getPresignedDownloadUrl(lesson.videoKey, 900)
    this.logger.info({ courseId, lessonId, userId }, 'Video URL generated')
    return { url, expiresIn: 900 }
  }

  async enrollFree(courseId, userId) {
    const course = await this.getById(courseId)
    if (!course.isFree) throw new AppError('This is a paid course. Please purchase it first.', 403)

    const existing = await courseRepository.findEnrollment(userId, courseId)
    if (existing) throw new AppError('Already enrolled', 409, 'DUPLICATE_ERROR')

    const enrollment = await courseRepository.createEnrollment(userId, courseId)
    await courseRepository.incrementEnrollments(courseId)
    this.logger.info({ courseId, userId }, 'User enrolled in free course')
    return enrollment
  }
}

module.exports = new CourseService()
```

---

### src/modules/course/course.controller.js

```js
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const courseService = require('./course.service')

const listCourses = catchAsync(async (req, res) => {
  const result = await courseService.listCourses(req.user._id, req.user.subExamId, req.query, req.lang)
  sendPaginated(res, result.data, result.pagination)
})

const getCourse = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getCourse(req.params.id, req.user._id))
})

const getVideoUrl = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.getVideoUrl(req.params.id, req.params.lessonId, req.user._id))
})

const enrollFree = catchAsync(async (req, res) => {
  sendSuccess(res, await courseService.enrollFree(req.params.id, req.user._id), 'Enrolled successfully')
})

module.exports = { listCourses, getCourse, getVideoUrl, enrollFree }
```

---

## ══════════════════════════════
## TEST MODULE
## ══════════════════════════════

### src/modules/test/test.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Test        = require('../../models/Test.model')
const TestAttempt = require('../../models/TestAttempt.model')

class TestRepository extends BaseRepository {
  constructor() {
    super(Test, 'test')
  }

  async createAttempt(data) {
    return TestAttempt.create(data)
  }

  async getAttemptsByUser(userId, options) {
    const { paginate } = require('../../core/paginate')
    return paginate(TestAttempt, { user: userId }, { ...options, sort: { attemptedAt: -1 }, populate: { path: 'test', select: 'title type' } })
  }

  async getLeaderboard(testId) {
    return TestAttempt.find({ test: testId, status: 'completed' })
      .sort({ score: -1, timeTaken: 1 }).limit(50)
      .populate('user', 'name avatar').lean()
  }
}

module.exports = new TestRepository()
```

---

### src/modules/test/test.service.js

```js
const BaseService    = require('../../core/BaseService')
const testRepository = require('./test.repository')
const { checkAccess } = require('../../lib/access')
const AppError = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class TestService extends BaseService {
  constructor() {
    super(testRepository, 'test')
    this.logger = createLogger('test:service')
  }

  async listTests(userId, subExamId, filters) {
    const filter = { subExam: subExamId, status: 'published' }
    if (filters.type)  filter.type  = filters.type
    if (filters.isFree !== undefined) filter.isFree = filters.isFree === 'true'
    return this.getAll(filter, { page: filters.page, limit: filters.limit, select: '-subTests.questions' })
  }

  async getTest(testId, userId) {
    const test      = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) return { ...test, subTests: test.subTests.map((s) => ({ ...s, questions: [] })), hasAccess: false }
    return { ...test, hasAccess: true }
  }

  async startSubTest(testId, subTestId, userId) {
    this.logger.info({ testId, subTestId, userId }, 'Sub-test started')
    const test = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) throw new AppError('Please purchase this test', 403, 'FORBIDDEN')

    const subTest = test.subTests.find((s) => s._id.toString() === subTestId)
    if (!subTest) throw new AppError('Sub-test not found', 404)

    // Return questions without correct answers
    return { ...subTest, questions: subTest.questions.map(({ correctOption, explanation, ...rest }) => rest) }
  }

  async submitAttempt(testId, subTestId, userId, answers, timeTaken) {
    this.logger.info({ testId, subTestId, userId }, 'Scoring attempt')
    const test = await this.getById(testId)
    const hasAccess = test.isFree || await checkAccess(userId, 'test', testId)
    if (!hasAccess) throw new AppError('Please purchase this test', 403, 'FORBIDDEN')

    const subTest = test.subTests.find((s) => s._id.toString() === subTestId)
    if (!subTest) throw new AppError('Sub-test not found', 404)

    let score = 0, correct = 0, wrong = 0, unattempted = 0

    for (const q of subTest.questions) {
      const ans = answers.find((a) => a.questionId.toString() === q._id.toString())
      if (!ans || ans.selectedOption == null) { unattempted++; continue }
      if (ans.selectedOption === q.correctOption) { score += q.marks; correct++ }
      else { if (test.negativeMarking) score -= q.negativeMarks; wrong++ }
    }

    const accuracy = subTest.questions.length > 0
      ? parseFloat(((correct / subTest.questions.length) * 100).toFixed(2)) : 0

    const attempt = await testRepository.createAttempt({
      user: userId, test: testId, subTestId,
      answers, score, totalMarks: subTest.totalMarks,
      accuracy, timeTaken, correct, wrong, unattempted, status: 'completed',
    })

    const { rankQueue } = require('../../jobs/queue')
    await rankQueue.add('calculate-rank', { attemptId: attempt._id, testId, subTestId })

    this.logger.info({ userId, testId, score, accuracy }, 'Attempt scored')
    return { score, totalMarks: subTest.totalMarks, accuracy, correct, wrong, unattempted }
  }

  async getLeaderboard(testId) { return testRepository.getLeaderboard(testId) }
  async getMyAttempts(userId, opts) { return testRepository.getAttemptsByUser(userId, opts) }
}

module.exports = new TestService()
```

---

### src/modules/test/test.controller.js

```js
const catchAsync = require('../../core/catchAsync')
const { sendSuccess, sendPaginated } = require('../../core/response')
const testService = require('./test.service')

const listTests     = catchAsync(async (req, res) => { const r = await testService.listTests(req.user._id, req.user.subExamId, req.query); sendPaginated(res, r.data, r.pagination) })
const getTest       = catchAsync(async (req, res) => { sendSuccess(res, await testService.getTest(req.params.id, req.user._id)) })
const startSubTest  = catchAsync(async (req, res) => { sendSuccess(res, await testService.startSubTest(req.params.id, req.params.subTestId, req.user._id)) })
const getLeaderboard = catchAsync(async (req, res) => { sendSuccess(res, await testService.getLeaderboard(req.params.id)) })
const getMyAttempts  = catchAsync(async (req, res) => { const r = await testService.getMyAttempts(req.user._id, req.query); sendPaginated(res, r.data, r.pagination) })

const submitAttempt = catchAsync(async (req, res) => {
  const result = await testService.submitAttempt(
    req.params.id, req.params.subTestId, req.user._id, req.body.answers, req.body.timeTaken
  )
  sendSuccess(res, result, 'Attempt submitted successfully')
})

module.exports = { listTests, getTest, startSubTest, submitAttempt, getLeaderboard, getMyAttempts }
```

---

## ══════════════════════════════
## PAYMENT MODULE
## ══════════════════════════════

### src/modules/payment/payment.repository.js

```js
const BaseRepository = require('../../core/BaseRepository')
const Order      = require('../../models/Order.model')
const Enrollment = require('../../models/Enrollment.model')

class PaymentRepository extends BaseRepository {
  constructor() {
    super(Order, 'payment')
  }

  async findByRazorpayOrderId(razorpayOrderId) {
    return this.findOne({ razorpayOrderId })  // BaseRepository.findOne
  }

  async createEnrollmentsForOrder(userId, courseItems) {
    if (!courseItems.length) return []
    const docs = courseItems.map((item) => ({ user: userId, course: item.itemId }))
    return Enrollment.insertMany(docs, { ordered: false }).catch(() => [])
  }
}

module.exports = new PaymentRepository()
```

---

### src/modules/payment/payment.service.js

```js
const BaseService       = require('../../core/BaseService')
const paymentRepository = require('./payment.repository')
const crypto  = require('crypto')
const Razorpay = require('razorpay')
const AppError = require('../../core/AppError')
const config   = require('../../config/env')
const { createLogger } = require('../../config/logger')

const razorpay = new Razorpay({ key_id: config.RAZORPAY_KEY_ID, key_secret: config.RAZORPAY_KEY_SECRET })

class PaymentService extends BaseService {
  constructor() {
    super(paymentRepository, 'payment')
    this.logger = createLogger('payment:service')
  }

  async createOrder(userId, items) {
    this.logger.info({ userId, itemCount: items.length }, 'Creating order')
    const totalAmount = items.reduce((sum, i) => sum + i.price, 0)

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), currency: 'INR', receipt: `receipt_${Date.now()}`,
    })

    // inherited: this.create() → BaseRepository.create()
    const order = await this.create({ user: userId, items, totalAmount, currency: 'INR', razorpayOrderId: rzpOrder.id, status: 'pending' })
    this.logger.info({ userId, orderId: order._id, totalAmount }, 'Order created')
    return { orderId: order._id, razorpayOrderId: rzpOrder.id, amount: totalAmount, currency: 'INR', keyId: config.RAZORPAY_KEY_ID }
  }

  async verifyPayment(userId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
    this.logger.info({ userId, razorpayOrderId }, 'Verifying payment')

    const expectedSig = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSig !== razorpaySignature) {
      this.logger.warn({ userId, razorpayOrderId }, 'Signature mismatch')
      throw new AppError('Invalid payment signature', 400, 'PAYMENT_INVALID')
    }

    const order = await paymentRepository.findByRazorpayOrderId(razorpayOrderId)
    if (!order)               throw new AppError('Order not found', 404)
    if (order.status === 'paid') throw new AppError('Payment already processed', 409)

    // inherited: this.update() → BaseRepository.updateById()
    const updated = await this.update(order._id, { status: 'paid', razorpayPaymentId, razorpaySignature, paidAt: new Date() })

    const courseItems = order.items.filter((i) => i.itemType === 'course')
    await paymentRepository.createEnrollmentsForOrder(userId, courseItems)

    const { notificationQueue, emailQueue } = require('../../jobs/queue')
    await Promise.all([
      notificationQueue.add('payment-success', { userId, orderId: order._id, amount: order.totalAmount }),
      emailQueue.add('payment-receipt', { userId, orderId: order._id }),
    ])

    this.logger.info({ userId, orderId: order._id }, 'Payment verified — access granted')
    return { success: true, order: updated }
  }

  async handleWebhook(body, signature) {
    const expected = crypto.createHmac('sha256', config.RAZORPAY_KEY_SECRET).update(JSON.stringify(body)).digest('hex')
    if (expected !== signature) throw new AppError('Invalid webhook signature', 400)

    if (body.event === 'payment.failed') {
      const { order_id } = body.payload.payment.entity
      await paymentRepository.updateOne({ razorpayOrderId: order_id }, { status: 'failed' })
      this.logger.warn({ razorpayOrderId: order_id }, 'Payment failed')
    }
  }
}

module.exports = new PaymentService()
```

---

### src/modules/payment/payment.controller.js

```js
const catchAsync = require('../../core/catchAsync')
const { sendSuccess } = require('../../core/response')
const paymentService = require('./payment.service')

const createOrder = catchAsync(async (req, res) => {
  sendSuccess(res, await paymentService.createOrder(req.user._id, req.body.items), 'Order created', 201)
})

const verifyPayment = catchAsync(async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body
  sendSuccess(res, await paymentService.verifyPayment(req.user._id, razorpayOrderId, razorpayPaymentId, razorpaySignature), 'Payment verified')
})

const webhook = catchAsync(async (req, res) => {
  await paymentService.handleWebhook(req.body, req.headers['x-razorpay-signature'])
  res.json({ received: true })
})

module.exports = { createOrder, verifyPayment, webhook }
```

---

## ══════════════════════════════
## ADMIN — how BaseService powers admin controllers too
## ══════════════════════════════

### src/admin/courses/admin-course.service.js

```js
/**
 * Admin course service reuses the same courseRepository.
 * Admins get full access — no isFree/status filter.
 * BaseService.getAll / create / update / remove are all inherited.
 */
const BaseService    = require('../../../core/BaseService')
const courseRepository = require('../../modules/course/course.repository')
const { getPresignedUploadUrl } = require('../../lib/s3')
const { createLogger } = require('../../config/logger')

class AdminCourseService extends BaseService {
  constructor() {
    super(courseRepository, 'admin:course')
    this.logger = createLogger('admin:course:service')
  }

  async listAll(filters) {
    // No status filter — admins see everything
    const filter = {}
    if (filters.status)  filter.status  = filters.status
    if (filters.subExam) filter.subExam = filters.subExam
    // inherited getAll
    return this.getAll(filter, { page: filters.page, limit: filters.limit })
  }

  async publish(courseId) {
    this.logger.info({ courseId }, 'Publishing course')
    // inherited update
    return this.update(courseId, { status: 'published', publishedAt: new Date() })
  }

  async archive(courseId) {
    this.logger.info({ courseId }, 'Archiving course')
    return this.update(courseId, { status: 'archived' })
  }

  async addLesson(courseId, lessonData) {
    this.logger.info({ courseId }, 'Adding lesson')
    return courseRepository.addLesson(courseId, lessonData)
  }

  async removeLesson(courseId, lessonId) {
    this.logger.info({ courseId, lessonId }, 'Removing lesson')
    return courseRepository.removeLesson(courseId, lessonId)
  }

  async getLessonUploadUrl(courseId, lessonId, contentType) {
    const key = `courses/${courseId}/lessons/${lessonId}/video`
    return getPresignedUploadUrl(key, contentType)
  }
}

module.exports = new AdminCourseService()
```

---

### src/admin/courses/admin-course.controller.js

```js
const catchAsync = require('../../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../../core/response')
const adminCourseService = require('./admin-course.service')

const listAll      = catchAsync(async (req, res) => { const r = await adminCourseService.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne       = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getById(req.params.id)) })
const createCourse = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.create({ ...req.body, createdBy: req.user._id })) })
const updateCourse = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.update(req.params.id, req.body)) })
const deleteCourse = catchAsync(async (req, res) => { await adminCourseService.archive(req.params.id); sendSuccess(res, null, 'Course archived') })
const publish      = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.publish(req.params.id), 'Course published') })
const addLesson    = catchAsync(async (req, res) => { sendCreated(res, await adminCourseService.addLesson(req.params.id, req.body)) })
const removeLesson = catchAsync(async (req, res) => { await adminCourseService.removeLesson(req.params.id, req.params.lessonId); sendSuccess(res, null, 'Lesson removed') })
const uploadUrl    = catchAsync(async (req, res) => { sendSuccess(res, await adminCourseService.getLessonUploadUrl(req.params.id, req.params.lessonId, req.body.contentType)) })

module.exports = { listAll, getOne, createCourse, updateCourse, deleteCourse, publish, addLesson, removeLesson, uploadUrl }
```

---

## ══════════════════════════════
## MIDDLEWARES
## ══════════════════════════════

### src/middlewares/auth.middleware.js

```js
const { verifyAccessToken } = require('../lib/jwt')
const AppError = require('../core/AppError')
const redis    = require('../config/redis')
const catchAsync = require('../core/catchAsync')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:auth')

// Use catchAsync here too — eliminates try/catch in middleware
const authMiddleware = catchAsync(async (req, _res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError('Authorization token required', 401, 'UNAUTHORIZED')
  }

  const token      = authHeader.split(' ')[1]
  const blacklisted = await redis.get(`blacklist:${token}`)
  if (blacklisted) {
    logger.warn({ ip: req.ip }, 'Blacklisted token used')
    throw new AppError('Token has been invalidated', 401, 'UNAUTHORIZED')
  }

  req.user  = verifyAccessToken(token)
  req.token = token
  logger.debug({ userId: req.user._id, role: req.user.role }, 'Auth passed')
  next()
})

module.exports = { authMiddleware }
```

---

### src/middlewares/admin.middleware.js

```js
const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('middleware:admin')

const adminMiddleware = (req, _res, next) => {
  if (req.user?.role !== 'admin') {
    logger.warn({ userId: req.user?._id, path: req.path }, 'Admin access denied')
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'))
  }
  logger.debug({ userId: req.user._id }, 'Admin access granted')
  next()
}

module.exports = { adminMiddleware }
```

---

### src/middlewares/rateLimiter.middleware.js

```js
const rateLimit = require('express-rate-limit')

const otpLimiter  = rateLimit({ windowMs: 60 * 60 * 1000, max: 5,   message: { success: false, error: { message: 'Too many OTP requests. Try in 1 hour.' } } })
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, error: { message: 'Too many requests.'                       } } })
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 })

module.exports = { otpLimiter, apiLimiter, adminLimiter }
```

---

### src/middlewares/language.middleware.js

```js
const languageMiddleware = (req, _res, next) => {
  req.lang = req.user?.language || (req.headers['accept-language']?.startsWith('hi') ? 'hi' : 'en') || 'hi'
  next()
}
module.exports = { languageMiddleware }
```

---

### src/middlewares/errorHandler.middleware.js

```js
/**
 * Global error handler — catches ALL errors forwarded via next(err).
 * Works with AppError (operational) and unexpected errors equally.
 * This is the ONLY place in the codebase that sends error responses.
 */
const { createLogger } = require('../config/logger')
const logger = createLogger('errorHandler')

const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500
  let message    = err.message    || 'Internal Server Error'
  let code       = err.code       || 'INTERNAL_ERROR'

  // Mongoose CastError — invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400; message = `Invalid value for field: ${err.path}`; code = 'INVALID_ID'
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400
    message = Object.values(err.errors).map((e) => e.message).join(', ')
    code = 'VALIDATION_ERROR'
  }

  // MongoDB duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field'
    statusCode = 409; message = `${field} already exists`; code = 'DUPLICATE_ERROR'
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError')  { statusCode = 401; code = 'UNAUTHORIZED' }
  if (err.name === 'TokenExpiredError')  { statusCode = 401; message = 'Token expired'; code = 'TOKEN_EXPIRED' }

  // Log appropriately
  if (statusCode >= 500) {
    logger.error({ err, method: req.method, url: req.url, userId: req.user?._id }, 'Server error')
  } else {
    logger.warn({ code, message, method: req.method, url: req.url, userId: req.user?._id }, 'Client error')
  }

  res.status(statusCode).json({
    success: false,
    error:   { code, message },
  })
}

module.exports = { errorHandler }
```

---

## LIB LAYER

### src/lib/jwt.js

```js
const jwt    = require('jsonwebtoken')
const config = require('../config/env')
const AppError = require('../core/AppError')

const signAccessToken  = (payload) => jwt.sign(payload, config.JWT_ACCESS_SECRET,  { expiresIn: '15m' })
const signRefreshToken = (payload) => jwt.sign(payload, config.JWT_REFRESH_SECRET, { expiresIn: '30d' })

const verifyAccessToken = (token) => {
  try { return jwt.verify(token, config.JWT_ACCESS_SECRET) }
  catch { throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED') }
}

const verifyRefreshToken = (token) => {
  try { return jwt.verify(token, config.JWT_REFRESH_SECRET) }
  catch { throw new AppError('Invalid or expired refresh token', 401, 'UNAUTHORIZED') }
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }
```

---

### src/lib/otp.js

```js
const redis  = require('../config/redis')
const AppError = require('../core/AppError')
const { createLogger } = require('../config/logger')

const logger = createLogger('otp')

const generateOtp     = () => Math.floor(100000 + Math.random() * 900000).toString()
const storeOtp        = async (phone, otp) => { await redis.set(`otp:${phone}`, otp, 'EX', 300); logger.debug({ phone }, 'OTP stored') }

const verifyOtp = async (phone, otp) => {
  const stored = await redis.get(`otp:${phone}`)
  if (!stored)        { logger.warn({ phone }, 'OTP expired'); throw new AppError('OTP expired. Request a new one.', 400, 'OTP_EXPIRED') }
  if (stored !== otp) { logger.warn({ phone }, 'Wrong OTP');   throw new AppError('Invalid OTP', 400, 'INVALID_OTP') }
  await redis.del(`otp:${phone}`)
  logger.info({ phone }, 'OTP verified')
}

const checkRateLimit = async (phone) => {
  const key   = `otp_attempts:${phone}`
  const count = await redis.incr(key)
  if (count === 1) await redis.expire(key, 3600)
  if (count > 5) { logger.warn({ phone, count }, 'OTP rate limit hit'); throw new AppError('Too many OTP requests. Try after 1 hour.', 429, 'RATE_LIMIT') }
}

module.exports = { generateOtp, storeOtp, verifyOtp, checkRateLimit }
```

---

### src/lib/access.js

```js
const Order      = require('../models/Order.model')
const Enrollment = require('../models/Enrollment.model')
const { createLogger } = require('../config/logger')

const logger = createLogger('access')

const checkAccess = async (userId, itemType, itemId) => {
  if (itemType === 'course') {
    const enrolled = await Enrollment.exists({ user: userId, course: itemId })
    if (enrolled) { logger.debug({ userId, itemType, itemId }, 'Access via enrollment'); return true }
  }

  const paid = await Order.exists({ user: userId, status: 'paid', 'items.itemType': itemType, 'items.itemId': itemId })
  logger.debug({ userId, itemType, itemId, hasAccess: !!paid }, 'Access via order check')
  return !!paid
}

module.exports = { checkAccess }
```

---

### src/lib/sms.js

```js
const axios  = require('axios')
const config = require('../config/env')
const { createLogger } = require('../config/logger')

const logger = createLogger('sms')

const sendOtpSms = async (phone, otp) => {
  try {
    await axios.post('https://api.msg91.com/api/v5/flow/', {
      template_id: config.MSG91_TEMPLATE_ID, short_url: '0', mobiles: `91${phone}`, var1: otp,
    }, { headers: { authkey: config.MSG91_AUTH_KEY, 'Content-Type': 'application/json' } })
    logger.info({ phone }, 'OTP SMS sent')
  } catch (err) {
    logger.error({ err, phone }, 'SMS send failed')
  }
}

module.exports = { sendOtpSms }
```

---

### src/lib/s3.js

```js
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { s3, bucket }   = require('../config/storage')

const getPresignedUploadUrl   = async (key, contentType, expiresIn = 3600) =>
  getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn })

const getPresignedDownloadUrl = async (key, expiresIn = 900) =>
  getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn })

module.exports = { getPresignedUploadUrl, getPresignedDownloadUrl }
```

---

## JOBS

### src/jobs/queue.js

```js
const { Queue } = require('bullmq')
const redis = require('../config/redis')
const { createLogger } = require('../config/logger')

const logger = createLogger('jobs:queue')

const videoQueue        = new Queue('video-transcode',  { connection: redis })
const emailQueue        = new Queue('email',            { connection: redis })
const notificationQueue = new Queue('notification',     { connection: redis })
const rankQueue         = new Queue('rank-calculation', { connection: redis })

logger.info('BullMQ queues initialized')
module.exports = { videoQueue, emailQueue, notificationQueue, rankQueue }
```

---

### src/jobs/workers/rank.worker.js

```js
const { Worker }  = require('bullmq')
const redis       = require('../../config/redis')
const TestAttempt = require('../../models/TestAttempt.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:rank')

new Worker('rank-calculation', async (job) => {
  const { attemptId, testId, subTestId } = job.data
  logger.info({ jobId: job.id, attemptId }, 'Rank calculation started')

  const attempt = await TestAttempt.findById(attemptId)
  if (!attempt) { logger.warn({ attemptId }, 'Attempt not found'); return }

  const rank = await TestAttempt.countDocuments({
    test: testId, subTestId, score: { $gt: attempt.score }, status: 'completed',
  }) + 1

  await TestAttempt.findByIdAndUpdate(attemptId, { rank })
  logger.info({ jobId: job.id, attemptId, rank }, 'Rank assigned')
}, { connection: redis })
```

---

### src/jobs/workers/notification.worker.js

```js
const { Worker } = require('bullmq')
const redis  = require('../../config/redis')
const admin  = require('firebase-admin')
const User   = require('../../models/User.model')
const Notification = require('../../models/Notification.model')
const config = require('../../config/env')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:notification')

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(JSON.parse(config.FCM_SERVICE_ACCOUNT_JSON)) })

new Worker('notification', async (job) => {
  const { userId, subExamId, all, title, body, data } = job.data
  logger.info({ jobId: job.id, title }, 'Notification job started')

  let filter = {}
  if (!all && subExamId) filter = { 'subExam._id': subExamId }
  else if (!all && userId) filter = { _id: userId }

  const users  = await User.find(filter).select('_id fcmToken').lean()
  const tokens = users.map((u) => u.fcmToken).filter(Boolean)

  if (tokens.length) {
    const result = await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body }, data: data || {} })
    logger.info({ jobId: job.id, sent: result.successCount, failed: result.failureCount }, 'FCM sent')
  }

  if (users.length) await Notification.insertMany(users.map((u) => ({ user: u._id, title, body, type: data?.type || 'system', data })))
  logger.info({ jobId: job.id, count: users.length }, 'Notification job done')
}, { connection: redis })
```

---

### src/jobs/workers/email.worker.js

```js
const { Worker } = require('bullmq')
const redis = require('../../config/redis')
const { createLogger } = require('../../config/logger')

const logger = createLogger('jobs:email')

new Worker('email', async (job) => {
  logger.info({ jobId: job.id, type: job.data.type, userId: job.data.userId }, 'Email job started')
  // TODO: integrate Nodemailer + AWS SES or Resend
  logger.info({ jobId: job.id }, 'Email sent (stub)')
}, { connection: redis })
```

---

## src/app.js

```js
const express    = require('express')
const helmet     = require('helmet')
const cors       = require('cors')
const compression = require('compression')
const pinoHttp   = require('pino-http')
const config     = require('./config/env')
const { rootLogger } = require('./config/logger')
const { apiLimiter, adminLimiter } = require('./middlewares/rateLimiter.middleware')
const { authMiddleware }  = require('./middlewares/auth.middleware')
const { adminMiddleware } = require('./middlewares/admin.middleware')
const { languageMiddleware } = require('./middlewares/language.middleware')
const { errorHandler }    = require('./middlewares/errorHandler.middleware')

const app = express()

app.use(helmet())
app.use(cors({ origin: config.ALLOWED_ORIGINS.split(','), credentials: true }))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(pinoHttp({
  logger: rootLogger,
  customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
}))
app.use(apiLimiter)
app.use(languageMiddleware)

// ── User API ──────────────────────────────────
app.use('/api/v1/auth',          require('./modules/auth/auth.routes'))
app.use('/api/v1/user',          authMiddleware, require('./modules/user/user.routes'))
app.use('/api/v1/qualifications', require('./modules/qualification/qualification.routes'))
app.use('/api/v1/courses',        authMiddleware, require('./modules/course/course.routes'))
app.use('/api/v1/tests',          authMiddleware, require('./modules/test/test.routes'))
app.use('/api/v1/test-attempts',  authMiddleware, require('./modules/test/attempt.routes'))
app.use('/api/v1/boosters',       authMiddleware, require('./modules/booster/booster.routes'))
app.use('/api/v1/progress',       authMiddleware, require('./modules/progress/progress.routes'))
app.use('/api/v1/payments',       require('./modules/payment/payment.routes'))
app.use('/api/v1/blog',           require('./modules/blog/blog.routes'))

// ── Admin API ─────────────────────────────────
app.use('/api/v1/admin', adminLimiter, authMiddleware, adminMiddleware, require('./admin/admin.router'))

// Must be LAST
app.use(errorHandler)

module.exports = app
```

---

## src/server.js

```js
const app  = require('./app')
const { connectDB } = require('./config/database')
const redis = require('./config/redis')
const config = require('./config/env')
const { rootLogger } = require('./config/logger')

// Register all job workers
require('./jobs/workers/rank.worker')
require('./jobs/workers/notification.worker')
require('./jobs/workers/email.worker')

const start = async () => {
  await connectDB()

  const server = app.listen(config.PORT, () => {
    rootLogger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started')
  })

  const shutdown = async (signal) => {
    rootLogger.info({ signal }, 'Shutting down')
    server.close(async () => {
      await redis.quit()
      await require('mongoose').connection.close()
      rootLogger.info('Graceful shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
  process.on('uncaughtException',  (err) => { rootLogger.fatal({ err }, 'Uncaught exception');  process.exit(1) })
  process.on('unhandledRejection', (err) => { rootLogger.fatal({ err }, 'Unhandled rejection'); process.exit(1) })
}

start().catch((err) => { rootLogger.fatal(err, 'Startup failed'); process.exit(1) })
```

---

## package.json

```json
{
  "name": "toppers-wisdom-api",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "dev":   "nodemon src/server.js",
    "seed":  "node src/seeds/seed.js",
    "lint":  "eslint src/**/*.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.4.0",
    "ioredis": "^5.3.2",
    "bullmq": "^5.7.0",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.13.1",
    "pino": "^9.2.0",
    "pino-http": "^10.2.0",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.3.1",
    "@aws-sdk/client-s3": "^3.600.0",
    "@aws-sdk/s3-request-presigner": "^3.600.0",
    "razorpay": "^2.9.2",
    "firebase-admin": "^12.2.0",
    "axios": "^1.7.2",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "nodemon": "^3.1.3",
    "pino-pretty": "^11.2.1",
    "eslint": "^8.57.0"
  }
}
```

---

## .eslintrc.js

```js
module.exports = {
  env: { node: true, es2020: true, commonjs: true },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars':  ['error', { argsIgnorePattern: '^_' }],
    'no-undef':        'error',
    'eqeqeq':         'error',
    'no-console':      'error',   // always use logger
    'no-var':          'error',
    'prefer-const':    'error',
  },
}
```

---

## nodemon.json

```json
{ "watch": ["src"], "ext": "js", "ignore": ["src/seeds/*"], "exec": "node -r dotenv/config src/server.js" }
```

---

## docker-compose.yml

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:7
    ports: ['27017:27017']
    volumes: ['mongodb_data:/data/db']
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
volumes:
  mongodb_data:
```

---

## .env.example

```
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/toppers-wisdom
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=change-this-random-32-char-string-here
JWT_REFRESH_SECRET=change-this-another-random-32-char-string
MSG91_AUTH_KEY=your-msg91-auth-key
MSG91_TEMPLATE_ID=your-otp-template-id
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=ap-south-1
AWS_S3_BUCKET=toppers-wisdom-media
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
ADMIN_PHONE=9999999999
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:3002
```

---

## Additional instructions for Claude Code

1. Every file uses `require()` / `module.exports`. No TypeScript. No ES modules.

2. The `src/core/` folder is the foundation. Create it FIRST before any modules.

3. Every module repository MUST extend `BaseRepository` and pass its Mongoose model to `super()`. Never write `Model.find()` directly in a repository — use `this.findMany()`, `this.findById()`, etc.

4. Every module service MUST extend `BaseService`. Standard CRUD comes for free — only add module-specific methods.

5. Every controller function MUST be wrapped with `catchAsync`. No try/catch blocks anywhere in controllers.

6. Every controller MUST use `sendSuccess`, `sendCreated`, `sendPaginated`, or `sendNoContent` from `src/core/response.js`. Never write `res.status().json()` directly.

7. `AppError` is imported from `src/core/AppError.js`. Services throw `new AppError(message, statusCode, code)`. Never throw raw `new Error()`.

8. `validate()` and `validateQuery()` are imported from `src/core/validate.js`. Apply to routes before controllers.

9. Admin controllers can reuse the same service instances as user controllers OR create their own admin service that extends BaseService with the same repository.

10. The `errorHandler` in `src/middlewares/errorHandler.middleware.js` handles ALL errors — Mongoose errors, JWT errors, AppErrors, and unexpected errors. It must be registered LAST in app.js.

11. Create all remaining modules (booster, blog, progress, qualification) following the same pattern as the auth and user modules shown above.

12. After all files are created: run `npm install`, fix any syntax errors, then create `README.md` with setup instructions and API endpoint table.

13. `no-console` ESLint rule is set to error — never use `console.log`. Always use `createLogger('module:layer')`.
