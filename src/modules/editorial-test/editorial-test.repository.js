const BaseRepository = require('../../core/BaseRepository')
const EditorialTest = require('../../models/EditorialTest.model')

class EditorialTestRepository extends BaseRepository {
    constructor() {
        super(EditorialTest, 'editorial-test')
    }
}

module.exports = new EditorialTestRepository()