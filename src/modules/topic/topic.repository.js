const BaseRepository = require('../../core/BaseRepository')
const Topic = require('../../models/Topic.model')

class TopicRepository extends BaseRepository {
  constructor() {
    super(Topic, 'topic')
  }
}

module.exports = new TopicRepository()
