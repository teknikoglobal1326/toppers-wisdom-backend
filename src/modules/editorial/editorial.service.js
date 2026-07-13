const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialRepository = require('./editorial.repository')
const Editorial = require('../../models/Editorial.model')
const UserEditorialLike = require('../../models/EditorialLike.model')

class EditorialService extends BaseService {
  constructor() {
    super(editorialRepository, 'editorial')
  }

  buildFilter({ type, status, editorialTest, isFree, search, publishDate } = {}) {
    const filter = { isDeleted: false }

    if (status) { filter.status = status }
    if (type) filter.type = type
    if (editorialTest) filter.editorialTest = editorialTest
    if (typeof isFree === 'boolean') filter.isFree = isFree

    if (publishDate) {
      const baseDate = new Date(publishDate)
      if (Number.isNaN(baseDate.getTime())) {
        throw new AppError('Invalid publishDate', 400, 'VALIDATION_ERROR')
      }

      const startDate = new Date(baseDate)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(baseDate)
      endDate.setHours(23, 59, 59, 999)

      filter.publishDate = {
        $gte: startDate,
        $lte: endDate,
      }
    }

    if (search) {
      const rx = new RegExp(search, 'i')
      filter.$or = [
        { title: rx },
        { shortDescription: rx },
        { description: rx },
      ]
    }

    return filter
  }

  buildSort(query = {}) {
    const fallbackDirection = query.sortOrder === 'desc' ? -1 : 1
    const sortOrderDirection = query.sortOrderDirection ? (query.sortOrderDirection === 'desc' ? -1 : 1) : null
    const publishDateDirection = query.publishDateDirection ? (query.publishDateDirection === 'desc' ? -1 : 1) : null

    const sort = {}

    if (sortOrderDirection || publishDateDirection) {
      if (sortOrderDirection) sort.sortOrder = sortOrderDirection
      if (publishDateDirection) sort.publishDate = publishDateDirection

      if (!sortOrderDirection) sort.sortOrder = 1
      if (!publishDateDirection) sort.publishDate = -1
      sort.createdAt = -1
      return sort
    }

    const sortBy = query.sortBy || 'sortOrder'
    sort[sortBy] = fallbackDirection

    if (sortBy !== 'sortOrder') sort.sortOrder = 1
    if (sortBy !== 'publishDate') sort.publishDate = -1
    sort.createdAt = -1

    return sort
  }

  async getStateEditorialIds(userId, listType = 'all') {
    if (!userId || listType === 'all') return []

    const filter = { userId }

    if (listType === 'read') {
      filter.isRead = true
    } else if (listType === 'bookmarked') {
      filter.$or = [{ isBookmarked: true }, { isLiked: true }]
    } else if (listType === 'unread') {
      filter.$or = [{ isRead: true }, { isBookmarked: true }, { isLiked: true }]
    }

    return UserEditorialLike.distinct('editorialId', filter)
  }

  async buildListFilter(query = {}, userId) {
    const filter = this.buildFilter(query)
    const listType = query.listType || 'all'

    if (!userId || listType === 'all') {
      return filter
    }

    const stateEditorialIds = await this.getStateEditorialIds(userId, listType)

    if (listType === 'read' || listType === 'bookmarked') {
      filter._id = { $in: stateEditorialIds }
      return filter
    }

    if (stateEditorialIds.length) {
      filter._id = { $nin: stateEditorialIds }
    }

    return filter
  }

  async attachLikeState(items = [], userId) {
    const ids = items.map((item) => item._id)
    if (!userId || !ids.length) {
      return items.map((item) => ({ ...item, isRead: false, isBookmarked: false, isLiked: false }))
    }

    const likes = await UserEditorialLike.find({
      userId,
      editorialId: { $in: ids },
    }).lean()

    const stateMap = new Map(likes.map((item) => [String(item.editorialId), item]))
    return items.map((item) => {
      const state = stateMap.get(String(item._id))
      const isBookmarked = !!(state?.isBookmarked || state?.isLiked)
      return {
        ...item,
        isRead: !!state?.isRead,
        isBookmarked,
        isLiked: isBookmarked,
        readAt: state?.readAt || null,
        bookmarkedAt: state?.bookmarkedAt || null,
      }
    })
  }

  async listAll(query = {}, userId) {
    const filter = await this.buildListFilter(query, userId)
    const sort = this.buildSort(query)

    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort,
      populate: [{ path: 'editorialTest' }],
    })

    const data = await this.attachLikeState(result.data, userId)
    return { ...result, data }
  }

  async getOne(id, userId) {
    const editorial = await editorialRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [{ path: 'editorialTest' }] }
    )

    if (!editorial) {
      throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    }

    const [withLikeState] = await this.attachLikeState([editorial], userId)
    return withLikeState
  }

  async setLike(editorialId, userId, isLiked = true) {
    return this.setBookmark(editorialId, userId, isLiked)
  }

  async setRead(editorialId, userId, isRead = true) {
    const editorial = await editorialRepository.findOne({ _id: editorialId, isDeleted: false,  })
    if (!editorial) {
      throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    }

    return UserEditorialLike.findOneAndUpdate(
      { userId, editorialId },
      {
        $set: {
          isRead: !!isRead,
          readAt: isRead ? new Date() : null,
        },
        $setOnInsert: { isLiked: false, isBookmarked: false, bookmarkedAt: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean()
  }

  async setBookmark(editorialId, userId, isBookmarked = true) {
    const editorial = await editorialRepository.findOne({ _id: editorialId, isDeleted: false })
    if (!editorial) {
      throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    }

    const existing = await UserEditorialLike.findOne({ userId, editorialId }).lean()
    const previous = !!(existing?.isBookmarked || existing?.isLiked)
    const nextValue = !!isBookmarked

    if (!existing && !nextValue) {
      return { editorialId, isBookmarked: false, isLiked: false }
    }

    await UserEditorialLike.findOneAndUpdate(
      { userId, editorialId },
      {
        $set: {
          isBookmarked: nextValue,
          isLiked: nextValue,
          bookmarkedAt: nextValue ? new Date() : null,
        },
        $setOnInsert: { isRead: false, readAt: null },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    if (previous !== nextValue) {
      const delta = nextValue ? 1 : -1
      await Editorial.updateOne({ _id: editorialId }, { $inc: { totalLikes: delta } })
      await Editorial.updateOne({ _id: editorialId }, { $max: { totalLikes: 0 } })
    }

    return { editorialId, isBookmarked: nextValue, isLiked: nextValue }
  }
}

module.exports = new EditorialService()
