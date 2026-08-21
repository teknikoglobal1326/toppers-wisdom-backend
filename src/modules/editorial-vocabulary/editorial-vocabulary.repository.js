const BaseRepository = require('../../core/BaseRepository')
const EditorialVocabulary = require('../../models/EditorailVocabulary')

class EditorialVocabularyRepository extends BaseRepository {
  constructor() {
    super(EditorialVocabulary, 'editorial-vocabulary')
  }
}

module.exports = new EditorialVocabularyRepository()
