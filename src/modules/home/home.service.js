const Banner = require('../../models/Banner.model')
const Short = require('../../models/Short.model')
const ShortCategory = require('../../models/ShortCategory.model')
const Course = require('../../models/Course.model')
const { createLogger } = require('../../config/logger')
const Testimonial = require('../../models/Testimonial.model')
const logger = createLogger('home:service')



const getHome = async (examId) => {
  logger.info({ examId }, 'Fetching home data')

  const [banners, shortCategories, courses] = await Promise.all([
    Banner.find({ examId, status: 'active', isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('name image examId subexamId')
      .lean(),
    ShortCategory.find({ examIds: examId, status: 'active', isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(4)
      .select('name bannerImage logo tags examIds')
      .lean(),
    Course.find({ exam: examId, status: 'published', isDeleted: false })
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(2)
      .select('title slug thumbnail price mrp isFree sortOrder avgRating totalEnrollments description')
      .lean(),
  ])

  const shortsData = await Promise.all(
    shortCategories.map(async (cat) => {
      const short = await Short.findOne({ categoryId: cat._id, status: 'active', isDeleted: false })
        .sort({ sortOrder: 1, createdAt: -1 })
        .select('videoUrl')
        .lean()
      return {
        ...cat,
        short: short || null
      }
    })
  )

  const testimonials = await Testimonial.find({ isDeleted: false })
    .sort({ priority: 1 })
    .limit(10)
    .select('name exam reviewText image')
    .lean()

  return {
    banners,
    shorts: shortsData,
    courses,
    testimonials
  }
}

module.exports = { getHome }
