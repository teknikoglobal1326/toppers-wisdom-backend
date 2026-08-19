const BaseService = require('../../core/BaseService')
const thoughtOfTheDayRepository = require('./thought-of-the-day.repository')
const ThoughtOfTheDay = require('../../models/ThoughtOfTheDay.model')
const TWPost = require('../../models/TWPost.model')

class ThoughtOfTheDayService extends BaseService {
  constructor() {
    super(thoughtOfTheDayRepository, 'thought-of-the-day')
  }

  async listFeed(query, userId) {
    this.logger.info({ query, userId }, 'Listing toppers wisdom feed')
    const page = Math.max(1, parseInt(query.page) || 1)
    const limit = Math.min(100, parseInt(query.limit) || 10)
    const skip = (page - 1) * limit
    const search = query.search ? String(query.search).trim() : ''

    const thoughtFilter = {
      isDeleted: false,
      status: 'active'
    }
    if (search) {
      thoughtFilter.$or = [
        { authorName: new RegExp(search, 'i') },
        { quote: new RegExp(search, 'i') }
      ]
    }

    const postFilter = {
      isDeleted: false,
      status: 'active'
    }
    if (search) {
      postFilter.$or = [
        { title: new RegExp(search, 'i') },
        { shortDescription: new RegExp(search, 'i') },
        { textContent: new RegExp(search, 'i') }
      ]
    }

    const pipeline = [
      { $match: thoughtFilter },
      { $addFields: { itemType: 'thought' } },
      {
        $unionWith: {
          coll: TWPost.collection.name,
          pipeline: [
            { $match: postFilter },
            { $addFields: { itemType: 'post' } }
          ]
        }
      },
      { $sort: { sortOrder: 1, createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ]

    const result = await ThoughtOfTheDay.aggregate(pipeline)

    const total = result[0]?.metadata[0]?.total || 0
    let data = result[0]?.data || []

    // Populate user details inside comments
    if (data.length > 0) {
      data = await ThoughtOfTheDay.populate(data, {
        path: 'comments.user',
        select: 'name avatar'
      })
    }

    // Map counts and user actions
    data = data.map(item => {
      if (item.itemType === 'thought') {
        const likes = item.likes || []
        const shares = item.shares || []
        return {
          ...item,
          likesCount: likes.length,
          sharesCount: shares.length,
          commentsCount: (item.comments || []).length,
          isLiked: userId ? likes.some(uId => String(uId) === String(userId)) : false,
          isShared: userId ? shares.some(uId => String(uId) === String(userId)) : false,
        }
      }
      return item
    })

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    }
  }

  async toggleLike(id, userId) {
    const thought = await ThoughtOfTheDay.findOne({ _id: id, isDeleted: false })
    if (!thought) {
      const AppError = require('../../core/AppError')
      throw new AppError('Thought not found', 404)
    }

    const likeIdx = thought.likes.findIndex(uId => String(uId) === String(userId))
    let liked = false
    if (likeIdx > -1) {
      thought.likes.splice(likeIdx, 1)
    } else {
      thought.likes.push(userId)
      liked = true
    }

    await thought.save()
    return { liked, likesCount: thought.likes.length }
  }

  async addComment(id, userId, commentText) {
    if (!commentText || !String(commentText).trim()) {
      const AppError = require('../../core/AppError')
      throw new AppError('Comment text is required', 400)
    }
    const thought = await ThoughtOfTheDay.findOne({ _id: id, isDeleted: false })
    if (!thought) {
      const AppError = require('../../core/AppError')
      throw new AppError('Thought not found', 404)
    }

    thought.comments.push({ user: userId, comment: String(commentText).trim() })
    await thought.save()

    const populated = await ThoughtOfTheDay.findById(id)
      .populate('comments.user', 'name avatar')
      .lean()

    return { comments: populated.comments, commentsCount: populated.comments.length }
  }

  async shareThought(id, userId) {
    const thought = await ThoughtOfTheDay.findOne({ _id: id, isDeleted: false })
    if (!thought) {
      const AppError = require('../../core/AppError')
      throw new AppError('Thought not found', 404)
    }

    const shareIdx = thought.shares.findIndex(uId => String(uId) === String(userId))
    if (shareIdx === -1) {
      thought.shares.push(userId)
      await thought.save()
    }

    return { sharesCount: thought.shares.length }
  }
}

module.exports = new ThoughtOfTheDayService()
