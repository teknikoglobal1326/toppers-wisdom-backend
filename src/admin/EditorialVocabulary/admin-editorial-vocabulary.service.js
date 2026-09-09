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

    const vocabularies = await Vocabulary.find({
      _id: { $in: vocabularyIds },
      isDeleted: false
    }).lean()

    if (vocabularies.length === 0) {
      throw new AppError('No matching vocabulary items found', 404, 'NOT_FOUND')
    }

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
      editorailTest: editorailTest,
      publishDate: publishDate ? new Date(publishDate) : vocab.publishDate,
      createdBy: adminId,
      updatedBy: adminId
    }))

    const importedDocs = await editorialVocabularyRepository.model.insertMany(copyPayloads)

    return {
      importedCount: importedDocs.length
    }
  }

  async bulkUpload(file, commonData = {}, adminId) {
    if (!file) throw new AppError('Excel or Word file is required', 400, 'VALIDATION_ERROR')

    const path = require('path')
    const extension = path.extname(file.originalname).toLowerCase()
    let rawRows = []

    if (extension === '.xlsx' || extension === '.xls' || extension === '.csv') {
      const XLSX = require('xlsx')
      const workbook = XLSX.read(file.buffer, { type: 'buffer' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
    } else if (extension === '.docx' || extension === '.doc') {
      const mammoth = require('mammoth')
      const cheerio = require('cheerio')
      const { value: html } = await mammoth.convertToHtml({ buffer: file.buffer })
      const $ = cheerio.load(html)

      $('table').each((_, tableDom) => {
        const tableRows = $(tableDom).find('tr')
        if (tableRows.length < 2) return

        const headers = []
        $(tableRows[0]).find('td, th').each((_, cell) => {
          headers.push($(cell).text().trim().toLowerCase().replace(/[\s_-]+/g, ''))
        })

        for (let i = 1; i < tableRows.length; i++) {
          const cells = $(tableRows[i]).find('td')
          const rowData = {}
          cells.each((cIdx, cell) => {
            const header = headers[cIdx]
            if (header) {
              rowData[header] = $(cell).text().trim()
            }
          })
          if (Object.keys(rowData).length > 0) {
            rawRows.push(rowData)
          }
        }
      })
    } else {
      throw new AppError('Unsupported file type. Please upload Excel (.xlsx, .xls, .csv) or Word (.docx, .doc) files.', 400, 'VALIDATION_ERROR')
    }

    if (!rawRows.length) {
      throw new AppError('No data found in uploaded file', 400, 'VALIDATION_ERROR')
    }

    const parseListField = (val) => {
      if (!val) return []
      if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean)
      if (typeof val === 'string') {
        if (val.startsWith('[') && val.endsWith(']')) {
          try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) return parsed.map(s => String(s).trim()).filter(Boolean)
          } catch (_) { }
        }
        return val.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean)
      }
      return []
    }

    const parseArrayObjectIds = (val) => {
      if (!val) return []
      if (Array.isArray(val)) return val.filter(Boolean)
      if (typeof val === 'string') {
        if (val.startsWith('[') && val.endsWith(']')) {
          try {
            const parsed = JSON.parse(val)
            if (Array.isArray(parsed)) return parsed.filter(Boolean)
          } catch (_) { }
        }
        return val.split(',').map(s => s.trim()).filter(Boolean)
      }
      return []
    }

    let targetEditorialTest = parseArrayObjectIds(commonData.editorailTest || commonData.editorialTest || commonData.testId)

    const defaultThumbnail = 'https://placehold.co/400x300?text=Editorial+Vocabulary'

    const documentsToInsert = []
    for (const row of rawRows) {
      const normalizedRow = {}
      for (const key of Object.keys(row)) {
        const normKey = key.toLowerCase().replace(/[\s_-]+/g, '')
        normalizedRow[normKey] = row[key]
      }

      const word = (normalizedRow.word || normalizedRow.term || normalizedRow.vocab || normalizedRow.vocabulary || normalizedRow.title || '').toString().trim()
      if (!word) continue;

      const title = (normalizedRow.title || word).toString().trim()
      let status = (normalizedRow.status || commonData.status || 'active').toString().trim().toLowerCase()
      if (!['draft', 'active', 'inactive'].includes(status)) {
        status = 'active'
      }

      const pronunciation = (normalizedRow.pronunciation || normalizedRow.phonetic || '').toString().trim()
      const shortDescription = (normalizedRow.shortdescription || normalizedRow.shortdesc || normalizedRow.meaning || normalizedRow.definition || normalizedRow.description || '').toString().trim()
      const longDescription = (normalizedRow.longdescription || normalizedRow.longdesc || normalizedRow.detail || normalizedRow.details || normalizedRow.explanation || '').toString().trim()

      const usages = parseListField(normalizedRow.usages || normalizedRow.usage || normalizedRow.examples || normalizedRow.example)
      const synonyms = parseListField(normalizedRow.synonyms || normalizedRow.synonym)
      const antonyms = parseListField(normalizedRow.antonyms || normalizedRow.antonym)

      const rawOrder = normalizedRow.sortorder || normalizedRow.order || commonData.sortOrder
      const sortOrder = rawOrder !== undefined && rawOrder !== '' && !isNaN(Number(rawOrder)) ? Number(rawOrder) : 0

      const thumbnail = (normalizedRow.thumbnail || normalizedRow.image || commonData.thumbnail || defaultThumbnail).toString().trim()

      const rowEditorialTest = parseArrayObjectIds(normalizedRow.editorialtest || normalizedRow.editorailtest || normalizedRow.testid)
      const editorialTest = rowEditorialTest.length > 0 ? rowEditorialTest : targetEditorialTest

      let publishDate = new Date()
      const rawDate = normalizedRow.publishdate || normalizedRow.date || commonData.publishDate
      if (rawDate) {
        const parsedDate = new Date(rawDate)
        if (!isNaN(parsedDate.getTime())) publishDate = parsedDate
      }

      documentsToInsert.push({
        title,
        word,
        pronunciation,
        thumbnail,
        shortDescription,
        longDescription,
        usages,
        synonyms,
        antonyms,
        publishDate,
        sortOrder,
        status,
        editorailTest: editorialTest,
        createdBy: adminId,
        updatedBy: adminId,
      })
    }

    if (!documentsToInsert.length) {
      throw new AppError('No valid vocabulary rows found in the uploaded file. Ensure at least "word" field is provided.', 400, 'VALIDATION_ERROR')
    }

    const inserted = await editorialVocabularyRepository.model.insertMany(documentsToInsert)
    return {
      insertedCount: inserted.length,
      vocabularies: inserted,
    }
  }
}

module.exports = new AdminEditorialVocabularyService()