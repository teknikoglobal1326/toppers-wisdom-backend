const BaseRepository = require('../../core/BaseRepository')
const Pdf = require('../../models/Pdf.model')

class PdfRepository extends BaseRepository {
  constructor() {
    super(Pdf, 'pdf')
  }
}

module.exports = new PdfRepository()
