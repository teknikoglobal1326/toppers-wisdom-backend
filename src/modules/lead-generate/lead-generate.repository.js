const BaseRepository = require('../../core/BaseRepository')
const Lead = require('../../models/Lead.model')

class LeadGenerateRepository extends BaseRepository {
  constructor() {
    super(Lead, 'lead')
  }
}

module.exports = new LeadGenerateRepository()
