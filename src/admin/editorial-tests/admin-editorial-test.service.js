const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialTestRepository = require('../../modules/editorial-test/editorial-test.repository')

const makeSlug = (value = '') => value
  .toLowerCase()
  .trim()
  .replace(/[^\w\s-]/g, '')
  .replace(/[\s_]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '')

class AdminEditorialTestService extends BaseService {
  constructor() {
    super(editorialTestRepository, 'admin:editorial-test')
  }

  normalizePayload(data = {}, existing = null) {
    const payload = { ...data }

    if (Object.prototype.hasOwnProperty.call(payload, 'editorialId')) {
      payload.editorial = payload.editorialId || null
    }

    // Standardize subjects / subjectIds
    let subjectList = []
    if (Array.isArray(payload.subjectIds)) {
      subjectList = payload.subjectIds.filter(Boolean)
    } else if (Array.isArray(payload.subjects)) {
      subjectList = payload.subjects.filter(Boolean)
    } else if (typeof payload.subjectIds === 'string' && payload.subjectIds) {
      subjectList = [payload.subjectIds]
    } else if (typeof payload.subjects === 'string' && payload.subjects) {
      subjectList = [payload.subjects]
    }
    payload.subjectIds = subjectList
    payload.subjects = subjectList

    // Standardize chapterIds
    if (Object.prototype.hasOwnProperty.call(payload, 'chapterIds')) {
      if (Array.isArray(payload.chapterIds)) {
        payload.chapterIds = payload.chapterIds.filter(Boolean)
      } else if (typeof payload.chapterIds === 'string' && payload.chapterIds) {
        payload.chapterIds = [payload.chapterIds]
      } else {
        payload.chapterIds = []
      }
    }

    // Standardize topicIds
    if (Object.prototype.hasOwnProperty.call(payload, 'topicIds')) {
      if (Array.isArray(payload.topicIds)) {
        payload.topicIds = payload.topicIds.filter(Boolean)
      } else if (typeof payload.topicIds === 'string' && payload.topicIds) {
        payload.topicIds = [payload.topicIds]
      } else {
        payload.topicIds = []
      }
    }

    // Standardize thumbnail & thumbnailImage
    const thumb = payload.thumbnail || payload.thumbnailImage || null
    payload.thumbnail = thumb
    payload.thumbnailImage = thumb

    // Standardize isPaid & isFree
    if (typeof payload.isPaid === 'boolean') {
      payload.isFree = !payload.isPaid
    } else if (typeof payload.isFree === 'boolean') {
      payload.isPaid = !payload.isFree
    }

    // Standardize mappedQuestions & totalMappedQuestions
    if (payload.mappedQuestions !== undefined && payload.totalMappedQuestions === undefined) {
      payload.totalMappedQuestions = payload.mappedQuestions
    } else if (payload.totalMappedQuestions !== undefined && payload.mappedQuestions === undefined) {
      payload.mappedQuestions = payload.totalMappedQuestions
    }

    // Resolve languages & localizedContent
    let languages = Array.isArray(payload.languages) && payload.languages.length
      ? payload.languages
      : (payload.language ? [payload.language] : null)
    if (!languages) {
      languages = (existing && Array.isArray(existing.languages) && existing.languages.length)
        ? existing.languages
        : ['en']
    }
    payload.languages = languages

    const buildBlock = (block) => ({
      title: block?.title || null,
      description: block?.description || null,
      instructions: block?.instructions || null,
    })

    const flatBlock = {
      title: payload.title || null,
      description: payload.description || null,
      instructions: payload.instructions || null,
    }
    const primaryLang = languages.includes('en') ? 'en' : languages[0]

    const localizedContent = {
      en: (existing && existing.localizedContent && existing.localizedContent.en) || null,
      hi: (existing && existing.localizedContent && existing.localizedContent.hi) || null,
    }

    for (const lang of ['en', 'hi']) {
      if (payload[lang]) {
        localizedContent[lang] = buildBlock(payload[lang])
      } else if (lang === primaryLang && (flatBlock.title || flatBlock.description || flatBlock.instructions)) {
        localizedContent[lang] = buildBlock(flatBlock)
      }
      if (!languages.includes(lang)) localizedContent[lang] = null
    }

    payload.localizedContent = localizedContent

    const primary = localizedContent[primaryLang] || localizedContent.en || localizedContent.hi
    if (primary) {
      payload.title = primary.title || payload.title || ''
      payload.description = primary.description || payload.description || null
      payload.instructions = primary.instructions || payload.instructions || null
    }

    if (!payload.slug && payload.title) {
      payload.slug = `${makeSlug(payload.title)}-${Date.now().toString(36)}`
    }

    if (payload.sortOrder !== undefined && payload.sortOrder !== null && payload.sortOrder !== '') {
      const parsed = Number(payload.sortOrder)
      if (!Number.isNaN(parsed)) payload.sortOrder = parsed
    }

    return payload
  }

  buildFilter({ status, isFree, isPaid, subject, editorial, search } = {}) {
    const filter = { isDeleted: false }
    if (status) filter.status = status
    if (typeof isFree === 'boolean') filter.isFree = isFree
    if (typeof isPaid === 'boolean') filter.isPaid = isPaid
    if (subject) {
      filter.$or = [{ subjects: subject }, { subjectIds: subject }]
    }
    if (editorial) filter.editorial = editorial
    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { title: rx },
        { description: rx },
        { instructions: rx },
        { 'localizedContent.en.title': rx },
        { 'localizedContent.hi.title': rx }
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
        { path: 'subjects', select: 'name' },
        { path: 'subjectIds', select: 'name' },
        { path: 'editorial', select: 'title' }
      ],
    })
  }

  async getOne(id) {
    const test = await editorialTestRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [
        { path: 'subjects', select: 'name' },
        { path: 'subjectIds', select: 'name' },
        { path: 'editorial', select: 'title' }
      ] }
    )
    if (!test) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')
    return test
  }

  async createEditorialTest(data, adminId) {
    const payload = this.normalizePayload(data)
    payload.createdBy = adminId
    payload.updatedBy = adminId
    return this.create(payload)
  }

  async updateEditorialTest(id, data, adminId) {
    const existing = await editorialTestRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')

    const payload = this.normalizePayload(data, existing)
    payload.updatedBy = adminId

    return editorialTestRepository.updateById(id, payload)
  }

  async softDelete(id, adminId) {
    const existing = await editorialTestRepository.findOne({ _id: id, isDeleted: false })
    if (!existing) throw new AppError('Editorial test not found', 404, 'NOT_FOUND')
    return editorialTestRepository.updateById(id, { isDeleted: true, status: 'inactive', updatedBy: adminId })
  }
}

module.exports = new AdminEditorialTestService()