const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialVocabularyRepository = require('./editorial-vocabulary.repository')

class EditorialVocabularyService extends BaseService {
  constructor() {
    super(editorialVocabularyRepository, 'editorial-vocabulary')
  }

  buildFilter({ editorailTest, editorialTest, testId, search } = {}) {
    const filter = { isDeleted: false, status: 'active' }

    const targetTest = editorailTest || editorialTest || testId
    if (targetTest) filter.editorailTest = targetTest

    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { title: rx },
        { word: rx },
        { shortDescription: rx }
      ]
    }

    return filter
  }

  async listAll(query = {}) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    return this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
      populate: [
        { path: 'editorailTest', select: 'title' }
      ]
    })
  }

  async getOne(id) {
    const vocab = await editorialVocabularyRepository.findOne(
      { _id: id, isDeleted: false, status: 'active' },
      { populate: [
        { path: 'editorailTest', select: 'title description status duration marks totalQuestions totalTime' }
      ] }
    )
    if (!vocab) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return vocab
  }
}

module.exports = new EditorialVocabularyService()
