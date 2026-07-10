const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const compression = require('compression')
const pinoHttp = require('pino-http')
const config = require('./config/env')
const { rootLogger } = require('./config/logger')
const { apiLimiter, adminLimiter } = require('./middlewares/rateLimiter.middleware')
const { authMiddleware } = require('./middlewares/auth.middleware')
const { adminAuthMiddleware } = require('./middlewares/adminAuth.middleware')
const { languageMiddleware } = require('./middlewares/language.middleware')
const { errorHandler } = require('./middlewares/errorHandler.middleware')

const path = require('path')

const app = express()

app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')))
app.use(helmet())
app.use(cors({ origin: config.ALLOWED_ORIGINS.split(','), credentials: true }))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(pinoHttp({
  logger: rootLogger,
  customLogLevel: (_req, res) => res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  serializers: {
    req: (req) => ({ method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
}))
app.use(apiLimiter)
app.use(languageMiddleware)

// ── Admin Auth ────────────────────────────────
app.use('/api/v1/admin-auth', require('./modules/admin-auth/admin-auth.routes'))

// ── Common (public, no auth) ──────────────────
app.use('/api/v1/common', require('./common/common.routes'))

// ── User API ──────────────────────────────────
app.use('/api/v1/auth', require('./modules/auth/auth.routes'))
app.use('/api/v1/user', authMiddleware, require('./modules/user/user.routes'))
app.use('/api/v1/home', authMiddleware, require('./modules/home/home.routes'))
app.use('/api/v1/qualifications', require('./modules/qualification/qualification.routes'))
app.use('/api/v1/courses', authMiddleware, require('./modules/course/course.routes'))
app.use('/api/v1/tests', authMiddleware, require('./modules/test/test.routes'))
app.use('/api/v1/test-attempts', authMiddleware, require('./modules/test/attempt.routes'))
app.use('/api/v1/boosters', authMiddleware, require('./modules/booster/booster.routes'))
app.use('/api/v1/test-series', authMiddleware, require('./modules/test-series/test-series.routes'))
app.use('/api/v1/previous-year-papers', authMiddleware, require('./modules/previous-year-paper/previous-year-paper.routes'))
app.use('/api/v1/progress', authMiddleware, require('./modules/progress/progress.routes'))
app.use('/api/v1/payments', require('./modules/payment/payment.routes'))
app.use('/api/v1/blog', authMiddleware, require('./modules/blog/blog.routes'))
app.use('/api/v1/books', require('./modules/book/book.routes'))
app.use('/api/v1/shorts', authMiddleware, require('./modules/short/short.routes'))
app.use('/api/v1/vocabulary', authMiddleware, require('./modules/vocabulary/vocabulary.routes'))
app.use('/api/v1/editorials', authMiddleware, require('./modules/editorial/editorial.routes'))
app.use('/api/v1/grammars', authMiddleware, require('./modules/grammar/grammar.routes'))

// ── Admin API ─────────────────────────────────
app.use('/api/v1/admin', adminLimiter, adminAuthMiddleware, require('./admin/admin.router'))

// Must be LAST
app.use(errorHandler)

module.exports = app