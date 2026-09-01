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
      data = await TWPost.populate(data, {
        path: 'comments.user',
        select: 'name avatar'
      })
    }

    // Map counts and user actions
    data = data.map(item => {
      const likes = item.likes || []
      const shares = item.shares || []
      const comments = item.comments || []
      return {
        ...item,
        likesCount: likes.length,
        sharesCount: shares.length,
        commentsCount: comments.length,
        isLiked: userId ? likes.some(uId => String(uId) === String(userId)) : false,
        isShared: userId ? shares.some(uId => String(uId) === String(userId)) : false,
      }
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
    const AppError = require('../../core/AppError')
    if (!id) {
      throw new AppError('TW Post ID is required', 400)
    }

    const post = await TWPost.findOne({ _id: id, isDeleted: false })
    if (!post) {
      throw new AppError('TW Post not found', 404)
    }

    if (!Array.isArray(post.likes)) {
      post.likes = []
    }

    const likeIdx = post.likes.findIndex(uId => String(uId) === String(userId))
    let liked = false
    if (likeIdx > -1) {
      post.likes.splice(likeIdx, 1)
    } else {
      post.likes.push(userId)
      liked = true
    }

    await post.save()
    return { liked, likesCount: post.likes.length }
  }

  async addComment(id, userId, commentText) {
    const AppError = require('../../core/AppError')
    if (!id) {
      throw new AppError('TW Post ID is required', 400)
    }
    if (!commentText || !String(commentText).trim()) {
      throw new AppError('Comment text is required', 400)
    }

    const post = await TWPost.findOne({ _id: id, isDeleted: false })
    if (!post) {
      throw new AppError('TW Post not found', 404)
    }

    if (!Array.isArray(post.comments)) {
      post.comments = []
    }

    post.comments.push({ user: userId, comment: String(commentText).trim() })
    await post.save()

    const populated = await TWPost.findById(id)
      .populate('comments.user', 'name avatar')
      .lean()

    return { comments: populated.comments, commentsCount: populated.comments.length }
  }

  async shareThought(id, userId) {
    const AppError = require('../../core/AppError')
    if (!id) {
      throw new AppError('TW Post ID is required', 400)
    }

    const post = await TWPost.findOne({ _id: id, isDeleted: false })
    if (!post) {
      throw new AppError('TW Post not found', 404)
    }

    if (!Array.isArray(post.shares)) {
      post.shares = []
    }

    const shareIdx = post.shares.findIndex(uId => String(uId) === String(userId))
    if (shareIdx === -1) {
      post.shares.push(userId)
      await post.save()
    }

    return { sharesCount: post.shares.length }
  }
}

module.exports = new ThoughtOfTheDayService()
