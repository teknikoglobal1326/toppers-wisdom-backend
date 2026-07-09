const BaseRepository = require('../../core/BaseRepository')
const Vocabulary = require('../../models/Vocabulary.model')

class VocabularyRepository extends BaseRepository {
    constructor() {
        super(Vocabulary, 'vocabulary')
    }
}

module.exports = new VocabularyRepository()