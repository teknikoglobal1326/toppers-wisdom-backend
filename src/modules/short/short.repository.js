const BaseRepository = require('../../core/BaseRepository')
const Short = require('../../models/Short.model')

class ShortRepository extends BaseRepository {
  constructor() {
    super(Short, 'short')
  }
}

module.exports = new ShortRepository()
