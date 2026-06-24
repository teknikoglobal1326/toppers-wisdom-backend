const BaseRepository = require('../../core/BaseRepository')
const Blog           = require('../../models/Blog.model')

class BlogRepository extends BaseRepository {
  constructor() { super(Blog, 'blog') }

  async findBySlug(slug) {
    return this.findOne({ slug, status: 'published' })
  }
}

module.exports = new BlogRepository()
