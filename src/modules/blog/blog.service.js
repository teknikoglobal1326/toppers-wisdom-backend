const BaseService      = require('../../core/BaseService')
const blogRepository   = require('./blog.repository')
const AppError         = require('../../core/AppError')
const { createLogger } = require('../../config/logger')

class BlogService extends BaseService {
  constructor() {
    super(blogRepository, 'blog')
    this.logger = createLogger('blog:service')
  }

  async listPosts(filters) {
    this.logger.info({ filters }, 'Listing blog posts')
    const filter = { status: 'published' }
    if (filters.category) filter.category = filters.category
    return this.getAll(filter, {
      page: filters.page, limit: filters.limit,
      select: 'title slug excerpt thumbnail category tags author publishedAt',
      sort: { publishedAt: -1 },
    })
  }

  async getPost(slug) {
    this.logger.info({ slug }, 'Fetching blog post')
    const post = await blogRepository.findBySlug(slug)
    if (!post) throw new AppError('Blog post not found', 404)
    return post
  }
}

module.exports = new BlogService()
