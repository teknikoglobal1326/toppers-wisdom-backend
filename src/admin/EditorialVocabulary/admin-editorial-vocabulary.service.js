const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialVocabularyRepository = require('../../modules/editorial-vocabulary/editorial-vocabulary.repository')

class AdminEditorialVocabularyService extends BaseService {
  constructor() {
    super(editorialVocabularyRepository, 'admin:editorial-vocabulary')
  }

  buildFilter({ editorailTest, editorialTest, testId, status, search } = {}) {
    const filter = { isDeleted: false }

    const targetTest = editorailTest || editorialTest || testId
    if (targetTest) {
      const testsArr = Array.isArray(targetTest) ? targetTest : String(targetTest).split(',').map(t => t.trim())
      filter.editorailTest = { $in: testsArr }
    }
    if (status) filter.status = status

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
      { _id: id, isDeleted: false },
      {
        populate: [
          { path: 'editorailTest' }
        ]
      }
    )
    if (!vocab) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return vocab
  }

  normalizePayload(data = {}, adminId) {
    const payload = { ...data, updatedBy: adminId }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    // Standardize editorailTest array
    let testList = []
    if (Array.isArray(payload.editorailTest)) {
      testList = payload.editorailTest.filter(Boolean)
    } else if (Array.isArray(payload.editorialTest)) {
      testList = payload.editorialTest.filter(Boolean)
    } else if (Array.isArray(payload.testId)) {
      testList = payload.testId.filter(Boolean)
    } else if (typeof payload.editorailTest === 'string' && payload.editorailTest) {
      testList = [payload.editorailTest]
    } else if (typeof payload.editorialTest === 'string' && payload.editorialTest) {
      testList = [payload.editorialTest]
    } else if (typeof payload.testId === 'string' && payload.testId) {
      testList = [payload.testId]
    }
    payload.editorailTest = testList

    if (Array.isArray(payload.usages)) {
      payload.usages = payload.usages.filter(Boolean)
    }
    if (Array.isArray(payload.synonyms)) {
      payload.synonyms = payload.synonyms.filter(Boolean)
    }
    if (Array.isArray(payload.antonyms)) {
      payload.antonyms = payload.antonyms.filter(Boolean)
    }

    return payload
  }

  async createVocab(data, adminId) {
    const payload = this.normalizePayload(data, adminId)
    payload.createdBy = adminId
    return this.create(payload)
  }

  async updateVocab(id, data, adminId) {
    const existing = await editorialVocabularyRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return editorialVocabularyRepository.updateById(id, this.normalizePayload(data, adminId))
  }

  async softDelete(id, adminId) {
    const existing = await editorialVocabularyRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial vocabulary not found', 404, 'NOT_FOUND')
    return editorialVocabularyRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
  }

  async importVocabularies(data, adminId) {
    const Vocabulary = require('../../models/Vocabulary.model')
    const { vocabularyIds, editorailTest, publishDate } = data

    // 1. Fetch matching source vocabularies
    const vocabularies = await Vocabulary.find({
      _id: { $in: vocabularyIds },
      isDeleted: false
    }).lean()

    if (vocabularies.length === 0) {
      throw new AppError('No matching vocabulary items found', 404, 'NOT_FOUND')
    }

    // 2. Clone fields into the Editorial Vocabulary schema structure
    const copyPayloads = vocabularies.map(vocab => ({
      title: vocab.title,
      word: vocab.word,
      pronunciation: vocab.pronunciation,
      audio: vocab.audio,
      thumbnail: vocab.thumbnail,
      bannerImage: vocab.bannerImage,
      shortDescription: vocab.shortDescription,
      longDescription: vocab.longDescription,
      usages: vocab.usages,
      synonyms: vocab.synonyms,
      antonyms: vocab.antonyms,
      sortOrder: vocab.sortOrder,
      status: vocab.status || 'draft',
      editorailTest: editorailTest, // Array of test ObjectIds
      publishDate: publishDate ? new Date(publishDate) : vocab.publishDate, // Overwrite with user input if supplied
      createdBy: adminId,
      updatedBy: adminId
    }))

    // 3. Bulk insert to database (original vocabularies remain untouched)
    const importedDocs = await editorialVocabularyRepository.model.insertMany(copyPayloads)

    return {
      importedCount: importedDocs.length
    }
  }
}

module.exports = new AdminEditorialVocabularyService()
