const BaseRepository = require('../../core/BaseRepository')
const GrammarCategory = require('../../models/GrammarCategory.model')

class GrammarCategoryRepository extends BaseRepository {
  constructor() {
    super(GrammarCategory, 'grammar-category')
  }
}

module.exports = new GrammarCategoryRepository()
