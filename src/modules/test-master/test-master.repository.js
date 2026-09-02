const BaseRepository = require('../../core/BaseRepository')
const TestMaster = require('../../models/TestMaster.model')

class TestMasterRepository extends BaseRepository {
  constructor() {
    super(TestMaster, 'testMaster')
  }
}

module.exports = new TestMasterRepository()
