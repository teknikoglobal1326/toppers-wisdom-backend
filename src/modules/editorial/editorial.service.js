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

  async attachLikeState(items = [], userId) {
    const ids = items.map((item) => item._id)
    if (!userId || !ids.length) {
      return items.map((item) => ({ ...item, isLiked: false }))
    }

    const likes = await UserEditorialLike.find({
      userId,
      editorialId: { $in: ids },
      isLiked: true,
    }).lean()

    const likedIds = new Set(likes.map((like) => String(like.editorialId)))
    return items.map((item) => ({ ...item, isLiked: likedIds.has(String(item._id)) }))
  }

  async listAll(query = {}, userId) {
    const filter = this.buildFilter(query)
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
    const editorial = await editorialRepository.findOne({ _id: editorialId, isDeleted: false, status: 'published' })
    if (!editorial) {
      throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    }

    const existing = await UserEditorialLike.findOne({ userId, editorialId }).lean()
    const previous = !!existing?.isLiked
    const nextValue = !!isLiked

    if (!existing && !nextValue) {
      return { editorialId, isLiked: false }
    }

    await UserEditorialLike.findOneAndUpdate(
      { userId, editorialId },
      { $set: { isLiked: nextValue } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    if (previous !== nextValue) {
      const delta = nextValue ? 1 : -1
      await Editorial.updateOne({ _id: editorialId }, { $inc: { totalLikes: delta } })
      await Editorial.updateOne({ _id: editorialId }, { $max: { totalLikes: 0 } })
    }

    return { editorialId, isLiked: nextValue }
  }
}

module.exports = new EditorialService()
