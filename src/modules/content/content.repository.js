const BaseRepository = require('../../core/BaseRepository')
const Content = require('../../models/Content.model')

class ContentRepository extends BaseRepository {
  constructor() {
    super(Content, 'content')
  }
}

module.exports = new ContentRepository()
