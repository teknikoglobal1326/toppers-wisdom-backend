const BaseRepository = require('../../core/BaseRepository')
const TWPost = require('../../models/TWPost.model')

class TWPostRepository extends BaseRepository {
  constructor() {
    super(TWPost, 'twpost')
  }
}

module.exports = new TWPostRepository()
