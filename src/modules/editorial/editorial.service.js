const BaseService = require('../../core/BaseService')
const AppError = require('../../core/AppError')
const editorialRepository = require('./editorial.repository')
const Editorial = require('../../models/Editorial.model')
const UserEditorialLike = require('../../models/EditorialLike.model')
const EditorialPurchase = require('../../models/EditorialPurchase.model')
const Course = require('../../models/Course.model')
const EditorialTopic = require('../../models/EditorialTopic.model')

class EditorialService extends BaseService {
  constructor() {
    super(editorialRepository, 'editorial')
  }

  buildFilter({ type, status, editorialTest, isFree, search, publishDate, editorialTopic } = {}) {
    const filter = { isDeleted: false }

    if (status) { filter.status = status }
    if (type) filter.type = type
    if (editorialTest) filter.editorialTest = editorialTest
    if (typeof isFree === 'boolean') filter.isFree = isFree
    if (editorialTopic) filter.editorialTopic = editorialTopic

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

    const courseParam = query.course || query.courseId
    if (courseParam) {
      const mongoose = require('mongoose')
      if (mongoose.Types.ObjectId.isValid(courseParam)) {
        const courseDoc = await Course.findById(courseParam).select('exam').lean()
        if (courseDoc && Array.isArray(courseDoc.exam) && courseDoc.exam.length > 0) {
          filter.exam = { $in: courseDoc.exam }
        }
      }
    }

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

  async attachLikeState(items = [], userId, topTodayIds = new Set()) {
    let hasGlobalPurchase = false;
    const activeSubs = [];

    if (userId) {
      const EditorialPurchase = require('../../models/EditorialPurchase.model');
      hasGlobalPurchase = !!(await EditorialPurchase.exists({ user: userId, status: 'completed' }));

      if (!hasGlobalPurchase) {
        const UserSubscription = require('../../models/UserSubscription.model');
        const userSubs = await UserSubscription.find({
          user: userId,
          isActive: true,
          endDate: { $gt: new Date() }
        }).populate('subscription').lean();

        userSubs.forEach(us => {
          if (us.subscription) {
            activeSubs.push(us.subscription);
          }
        });
      }
    }

    const ids = items.map((item) => item._id)
    if (!userId || !ids.length) {
      return items.map((item) => {
        const doc = typeof item.toObject === 'function' ? item.toObject() : item

        let hasAccess = false;
        if (doc.isFree !== false) {
          hasAccess = true;
        } else if (topTodayIds.has(doc._id.toString())) {
          hasAccess = true;
        }

        return {
          ...doc,
          isRead: false,
          isBookmarked: false,
          isLiked: false,
          hasAccess
        }
      })
    }

    const likes = await UserEditorialLike.find({
      userId,
      editorialId: { $in: ids },
    }).lean()

    const stateMap = new Map(likes.map((item) => [String(item.editorialId), item]))
    return items.map((item) => {
      const doc = typeof item.toObject === 'function' ? item.toObject() : item
      const state = stateMap.get(String(doc._id))
      const isBookmarked = !!(state?.isBookmarked || state?.isLiked)

      let hasAccess = false;
      if (doc.isFree !== false) {
        hasAccess = true;
      } else if (topTodayIds.has(doc._id.toString())) {
        hasAccess = true;
      } else if (hasGlobalPurchase) {
        hasAccess = true;
      } else {
        hasAccess = activeSubs.some(sub => {
          if (!Array.isArray(sub.boosters)) return false;
          return sub.boosters.some(b => {
            const type = (b.moduleType || '').toLowerCase();
            if (type === 'editorial') {
              if (!b.moduleId || b.moduleId.length === 0) return true;
              return b.moduleId.some(id => id.toString() === doc._id.toString());
            }
            return false;
          });
        });
      }

      return {
        ...doc,
        isRead: !!state?.isRead,
        isBookmarked,
        isLiked: isBookmarked,
        readAt: state?.readAt || null,
        bookmarkedAt: state?.bookmarkedAt || null,
        hasAccess
      }
    })
  }

  async listAll(query = {}, userId) {
    console.log("editorila userId", userId);
    const filter = await this.buildListFilter(query, userId)
    const sort = this.buildSort(query)

    const result = await this.getAll(filter, {
      page: query.page,
      limit: query.limit,
      sort,
      select: 'title slug publishDate shortDescription thumbnail isFree editorialTopic',
      populate: [{ path: 'editorialTopic', select: 'name' }],
    })

    // Get top 10 today's editorials
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const Editorial = require('../../models/Editorial.model')
    const topTodayEditorials = await Editorial.find({
      isDeleted: false,
      status: 'published',
      publishDate: { $gte: startOfToday, $lte: endOfToday }
    })
      .sort(sort)
      .limit(10)
      .select('_id')
      .lean()

    const topTodayIds = new Set(topTodayEditorials.map(e => e._id.toString()))

    let editorialTopics = undefined
    if (query.type === 'ncert_based') {
      const EditorialTopic = require('../../models/EditorialTopic.model')
      editorialTopics = await EditorialTopic.find({ status: 'active', isDeleted: false })
        .sort({ sortOrder: 1, name: 1 })
        .select('name')
        .lean()
    }

    const data = await this.attachLikeState(result.data, userId, topTodayIds)
    return { ...result, data, ...(editorialTopics && { editorialTopics }) }
  }

  async getOne(id, userId) {
    const editorial = await editorialRepository.findOne(
      { _id: id, isDeleted: false },
      { populate: [{ path: 'editorialTest' }, { path: 'editorialTopic', select: 'name' }] }
    )

    if (!editorial) {
      throw new AppError('Editorial not found', 404, 'NOT_FOUND')
    }

    // Check if it is in the top 10 today's editorials
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    const Editorial = require('../../models/Editorial.model')
    const topTodayEditorials = await Editorial.find({
      isDeleted: false,
      status: 'published',
      publishDate: { $gte: startOfToday, $lte: endOfToday }
    })
      .sort({ sortOrder: 1, publishDate: -1, createdAt: -1 })
      .limit(10)
      .select('_id')
      .lean()

    const topTodayIds = new Set(topTodayEditorials.map(e => e._id.toString()))

    const [withLikeState] = await this.attachLikeState([editorial], userId, topTodayIds)
    return withLikeState
  }

  async setLike(editorialId, userId, isLiked = true) {
    return this.setBookmark(editorialId, userId, isLiked)
  }

  async setRead(editorialId, userId, isRead = true) {
    const editorial = await editorialRepository.findOne({ _id: editorialId, isDeleted: false, })
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

  async getPurchaseStatus(userId) {
    if (!userId) return false

    // 1. Direct purchase of editorial plan
    const EditorialPurchase = require('../../models/EditorialPurchase.model')
    const hasPlanPurchase = await EditorialPurchase.exists({ user: userId, status: 'completed' })
    if (hasPlanPurchase) return true

    // 2. Subscription plans containing editorial booster
    const UserSubscription = require('../../models/UserSubscription.model')
    const userSubs = await UserSubscription.find({
      user: userId,
      isActive: true,
      endDate: { $gt: new Date() }
    }).populate('subscription').lean()

    const hasSubAccess = userSubs.some(us => {
      const sub = us.subscription
      if (!sub || !Array.isArray(sub.boosters)) return false
      return sub.boosters.some(b => (b.moduleType || '').toLowerCase() === 'editorial')
    })

    return hasSubAccess
  }

  async purchaseSection(userId, amount) {
    const Subscription = require('../../models/Subscription.model')
    const activeSubs = await Subscription.find({ isActive: true, isDeleted: false }).lean()
    const editorialSub = activeSubs.find(sub => {
      const hasNoTests = !sub.tests || sub.tests.length === 0
      const hasBoosters = sub.boosters && sub.boosters.length > 0
      const onlyEditorials = hasBoosters && sub.boosters.every(b => b.moduleType === 'Editorial' || b.moduleType === 'editorial')
      return hasNoTests && onlyEditorials
    })

    if (editorialSub) {
      const UserSubscription = require('../../models/UserSubscription.model')
      const existingSub = await UserSubscription.findOne({
        user: userId,
        subscription: editorialSub._id,
        isActive: true,
        endDate: { $gt: new Date() }
      }).lean()

      if (existingSub) {
        return existingSub
      }

      const startDate = new Date()
      const durationDays = editorialSub.durationDays || 365
      const endDate = new Date(startDate.getTime() + (durationDays * 24 * 60 * 60 * 1000))

      return UserSubscription.create({
        user: userId,
        subscription: editorialSub._id,
        startDate,
        endDate,
        isActive: true
      })
    }

    return null
  }

  async getActivePlan() {
    const Subscription = require('../../models/Subscription.model')
    const activeSubs = await Subscription.find({ isActive: true, isDeleted: false }).lean()
    console.log("activeSubs===================>>", activeSubs);
    const editorialSub = activeSubs.find(sub => {
      const hasNoTests = !sub.tests || sub.tests.length === 0
      const hasBoosters = sub.boosters && sub.boosters.length > 0
      const onlyEditorials = hasBoosters && sub.boosters.every(b => b.moduleType === 'Editorial' || b.moduleType === 'editorial')
      return hasNoTests && onlyEditorials
    })

    if (editorialSub) {
      return {
        _id: editorialSub._id,
        title: editorialSub.name,
        description: editorialSub.description,
        price: editorialSub.price,
        discountPrice: editorialSub.price,
        validityInMonths: Math.round(editorialSub.durationDays / 30) || 12,
        isSubscriptionPlan: true
      }
    }

    return null
  }

  async getTopics() {
    const EditorialTopic = require('../../models/EditorialTopic.model')
    return EditorialTopic.find({ status: 'active', isDeleted: false })
      .sort({ sortOrder: 1, name: 1 })
      .select('name')
      .lean()
  }
}

module.exports = new EditorialService()
