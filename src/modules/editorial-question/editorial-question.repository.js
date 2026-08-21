const BaseRepository = require('../../core/BaseRepository')
const Question = require('../../models/Question.model')

class EditorialQuestionRepository extends BaseRepository {
    constructor() {
        super(Question, 'editorial-question')
    }
}

module.exports = new EditorialQuestionRepository()