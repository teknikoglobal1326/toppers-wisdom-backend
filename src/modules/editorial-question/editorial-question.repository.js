const BaseRepository = require('../../core/BaseRepository')
const EditorialQuestion = require('../../models/EditorialQuestion.model')

class EditorialQuestionRepository extends BaseRepository {
    constructor() {
        super(EditorialQuestion, 'editorial-question')
    }
}

module.exports = new EditorialQuestionRepository()