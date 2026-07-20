const Banner = require('../../models/Banner.model')
const Short = require('../../models/Short.model')
const ShortCategory = require('../../models/ShortCategory.model')
const Course = require('../../models/Course.model')
const { createLogger } = require('../../config/logger')

const logger = createLogger('home:service')

// Static placeholder data until a Testimonial model/admin CRUD is built
const TESTIMONIALS = [
  { _id: '1', name: 'Ravi Kumar', designation: 'SSC CGL 2024', photo: "/uploads/banners/Container.png", message: 'Toppers Wisdom helped me crack SSC CGL in my first attempt!', rating: 5 },
  { _id: '2', name: 'Priya Sharma', designation: 'IBPS PO 2024', photo: "/uploads/banners/Container.png", message: 'The mock tests were exactly like the real exam pattern.', rating: 5 },
  { _id: '3', name: 'Amit Singh', designation: 'Railway Group D', photo: "/uploads/banners/Container.png", message: 'Best platform for railway exam preparation in Hindi.', rating: 4 },
  { _id: '4', name: 'Sneha Verma', designation: 'UPSC Prelims 2024', photo: "/uploads/banners/Container.png", message: 'Quality content and very affordable courses.', rating: 5 },
]

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

  return {
    banners,
    shorts: shortsData,
    courses,
    testimonials: TESTIMONIALS,
  }
}

module.exports = { getHome }
