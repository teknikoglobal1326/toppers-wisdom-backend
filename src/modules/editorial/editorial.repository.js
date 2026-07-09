const BaseRepository = require('../../core/BaseRepository')
const Editorial = require('../../models/Editorial.model')

class EditorialRepository extends BaseRepository {
    constructor() {
        super(Editorial, 'editorial')
    }
}

module.exports = new EditorialRepository()