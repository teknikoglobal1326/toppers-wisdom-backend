const BaseRepository = require('../../core/BaseRepository')
const Book = require('../../models/Book.model')

class BookRepository extends BaseRepository {
  constructor() {
    super(Book, 'book')
  }
}

module.exports = new BookRepository()
