const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const grammarRepository = require('./grammar.repository')
const Grammar = require('../../models/Grammar.model')
const UserGrammarChapterLike = require('../../models/GrammarChapterLike.model')

class GrammarService extends BaseService {
  constructor() {
    super(grammarRepository, 'grammar')
  }

  buildFilter({ status, title, topicName, search } = {}) {
    const filter = { isDeleted: false }

    if (status) filter.status = status
    if (title) filter.title = { $regex: title, $options: 'i' }
    if (topicName) filter.topicName = { $regex: topicName, $options: 'i' }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { topicName: { $regex: search, $options: 'i' } },
        { 'chapters.chapterName': { $regex: search, $options: 'i' } },
      ]
    }

    return filter
  }

  sortChapters(chapters = [], direction = 'asc') {
    const multiplier = direction === 'desc' ? -1 : 1
    return [...chapters].sort((a, b) => {
      const aOrder = Number.isFinite(a?.sortOrder) ? a.sortOrder : 0
      const bOrder = Number.isFinite(b?.sortOrder) ? b.sortOrder : 0
      return (aOrder - bOrder) * multiplier
    })
  }

  async getLikeMap(userId, grammarIds = []) {
    if (!userId || !grammarIds.length) return new Map()

    const likes = await UserGrammarChapterLike.find({
      userId,
      grammarId: { $in: grammarIds },
      isLiked: true,
    }).select('grammarId chapterId').lean()

    const map = new Map()
    for (const like of likes) {
      map.set(`${String(like.grammarId)}:${String(like.chapterId)}`, true)
    }
    return map
  }

  async attachChapterLikeState(items = [], userId, topicSortOrder = 'asc') {
    const grammarIds = items.map((item) => item._id)
    const likeMap = await this.getLikeMap(userId, grammarIds)

    return items.map((item) => ({
      ...item,
      chapters: this.sortChapters(item.chapters || [], topicSortOrder).map((chapter) => ({
        ...chapter,
        isLiked: likeMap.has(`${String(item._id)}:${String(chapter._id)}`),
      })),
    }))
  }

  async listAll(query = {}, userId) {
    const filter = this.buildFilter(query)
    const direction = query.sortOrder === 'desc' ? -1 : 1
    const sortBy = query.sortBy || 'sortOrder'

    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort: { [sortBy]: direction, createdAt: -1 },
    })

    const data = await this.attachChapterLikeState(result.data, userId, query.topicSortOrder)
    return { ...result, data }
  }

  async getOne(id, topicSortOrder = 'asc', userId) {
    const grammar = await grammarRepository.findOne({ _id: id, isDeleted: false, status: 'active' })
    if (!grammar) throw new AppError('Grammar not found', 404, 'NOT_FOUND')

    const [withState] = await this.attachChapterLikeState([grammar], userId, topicSortOrder)
    return withState
  }

  async setChapterLike(grammarId, chapterId, userId, isLiked = true) {
    const grammar = await Grammar.findOne({ _id: grammarId, isDeleted: false, status: 'active' }).select('chapters').lean()
    if (!grammar) throw new AppError('Grammar not found', 404, 'NOT_FOUND')

    const chapter = (grammar.chapters || []).find((item) => String(item._id) === String(chapterId))
    if (!chapter) throw new AppError('Chapter not found', 404, 'NOT_FOUND')

    const existing = await UserGrammarChapterLike.findOne({ userId, grammarId, chapterId }).lean()
    const previous = !!existing?.isLiked
    const nextValue = !!isLiked

    if (!existing && !nextValue) {
      return { grammarId, chapterId, isLiked: false, totalLikes: chapter.totalLikes || 0 }
    }

    await UserGrammarChapterLike.findOneAndUpdate(
      { userId, grammarId, chapterId },
      { $set: { isLiked: nextValue } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )

    if (previous !== nextValue) {
      const delta = nextValue ? 1 : -1
      await Grammar.updateOne({ _id: grammarId, 'chapters._id': chapterId }, { $inc: { 'chapters.$.totalLikes': delta } })
      await Grammar.updateOne({ _id: grammarId, 'chapters._id': chapterId }, { $max: { 'chapters.$.totalLikes': 0 } })
    }

    const refreshed = await Grammar.findOne({ _id: grammarId, 'chapters._id': chapterId }, { 'chapters.$': 1 }).lean()
    const refreshedChapter = refreshed?.chapters?.[0] || chapter

    return {
      grammarId,
      chapterId,
      isLiked: nextValue,
      totalLikes: refreshedChapter.totalLikes || 0,
    }
  }
}

module.exports = new GrammarService()
