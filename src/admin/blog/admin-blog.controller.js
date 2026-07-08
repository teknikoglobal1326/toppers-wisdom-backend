const catchAsync     = require('../../core/catchAsync')
const { sendSuccess, sendCreated, sendPaginated } = require('../../core/response')
const BaseService    = require('../../core/BaseService')
const blogRepository = require('../../modules/blog/blog.repository')
const { createLogger } = require('../../config/logger')
const { createWithLanguage } = require('../../core/createWithLanguage')

const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Date.now().toString(36)
  return base ? `${base}-${suffix}` : suffix
}

class AdminBlogService extends BaseService {
  constructor() {
    super(blogRepository, 'admin:blog')
    this.logger = createLogger('admin:blog:service')
  }

  async create(data) {
    return createWithLanguage(
      (d) => super.create({ ...d, slug: generateSlug(d.title) }),
      data,
    )
  }

  async createDual({ hi, en }, createdBy) {
    const [hiResult, enResult] = await Promise.all([
      super.create({ ...hi, language: 'hi', slug: generateSlug(hi.title), createdBy }),
      super.create({ ...en, language: 'en', slug: generateSlug(en.title), createdBy }),
    ])
    return [hiResult, enResult]
  }

  async listAll(filters) {
    const filter = {}
    if (filters.status) filter.status = filters.status
    const direction = filters.sortOrder === 'desc' ? -1 : 1
    return this.getAll(filter, {
      page: filters.page,
      limit: filters.limit,
      sort: { sortOrder: direction, createdAt: -1 },
      select: 'title slug image shortDescription sortOrder status category publishedAt createdAt',
    })
  }

  async publish(id) {
    return this.update(id, { status: 'published', publishedAt: new Date() })
  }
}

const svc = new AdminBlogService()

const listAll = catchAsync(async (req, res) => { const r = await svc.listAll(req.query); sendPaginated(res, r.data, r.pagination) })
const getOne = catchAsync(async (req, res) => { sendSuccess(res, await svc.getById(req.params.id)) })
const createPost = catchAsync(async (req, res) => {
  if (req.body.hi && req.body.en) {
    sendCreated(res, await svc.createDual(req.body, req.admin._id))
  } else {
    sendCreated(res, await svc.create({ ...req.body, createdBy: req.admin._id }))
  }
})
const updatePost = catchAsync(async (req, res) => { sendSuccess(res, await svc.update(req.params.id, req.body)) })
const updatePostDual = catchAsync(async (req, res) => {
  const { hiId, enId, hi, en } = req.body
  const [hiResult, enResult] = await Promise.all([
    svc.update(hiId, hi),
    svc.update(enId, en),
  ])
  sendSuccess(res, [hiResult, enResult], 'Dual posts updated')
})
const deletePost = catchAsync(async (req, res) => { await svc.remove(req.params.id); sendSuccess(res, null, 'Post deleted') })
const publish = catchAsync(async (req, res) => { sendSuccess(res, await svc.publish(req.params.id), 'Post published') })

module.exports = { listAll, getOne, createPost, updatePost, updatePostDual, deletePost, publish }
