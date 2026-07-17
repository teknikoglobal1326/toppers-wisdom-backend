const BaseRepository = require('../../core/BaseRepository')
const ShortCategory = require('../../models/ShortCategory.model')

class ShortCategoryRepository extends BaseRepository {
  constructor() {
    super(ShortCategory, 'short-category')
  }
}

module.exports = new ShortCategoryRepository()
