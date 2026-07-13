const BaseRepository = require('../../core/BaseRepository')
const Grammar = require('../../models/Grammar.model')

class GrammarRepository extends BaseRepository {
  constructor() {
    super(Grammar, 'grammar')
  }
}

module.exports = new GrammarRepository()
