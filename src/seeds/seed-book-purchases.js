require('dotenv').config()
const mongoose = require('mongoose')
const crypto = require('crypto')
const config = require('../config/env')
const { rootLogger } = require('../config/logger')
const User = require('../models/User.model')
const Book = require('../models/Book.model')
const BookPurchase = require('../models/BookPurchase.model')

const sampleBooksData = [
  {
    title: 'Complete Quantitative Aptitude for Banking & SSC',
    author: 'R. K. Sharma',
    description: 'Comprehensive guide with 5000+ practice questions and detailed shortcut techniques for IBPS, SBI, and SSC exams.',
    price: 499,
    mrp: 799,
    section: 'books',
    isFree: false,
    language: 'both',
    pages: 650,
    rating: 4.8,
    tags: ['math', 'quant', 'banking', 'ssc'],
    status: 'active',
  },
  {
    title: 'English Vocabulary & Reading Comprehension Booster',
    author: 'Dr. Meenakshi Sundaram',
    description: 'Editorial vocabulary analysis, root words, idioms, and reading comprehension passages with exam-oriented solutions.',
    price: 299,
    mrp: 499,
    section: 'eBooks',
    isFree: false,
    language: 'en',
    pages: 320,
    rating: 4.6,
    tags: ['english', 'vocab', 'editorial', 'upsc'],
    status: 'active',
  },
  {
    title: 'Reasoning & Analytical Logic Masterclass',
    author: 'Anand Prakash',
    description: 'Puzzles, seating arrangement, critical reasoning, and syllogisms broken down with step-by-step methods.',
    price: 399,
    mrp: 599,
    section: 'books',
    isFree: false,
    language: 'hi',
    pages: 480,
    rating: 4.7,
    tags: ['reasoning', 'logic', 'puzzles'],
    status: 'active',
  },
  {
    title: 'Current Affairs & General Awareness Yearly Digest 2026',
    author: 'Toppers Wisdom Editorial Team',
    description: 'Month-wise national & international news, government schemes, awards, economy updates, and MCQ tests.',
    price: 199,
    mrp: 350,
    section: 'eBooks',
    isFree: false,
    language: 'both',
    pages: 280,
    rating: 4.9,
    tags: ['current affairs', 'gk', 'banking', 'railway'],
    status: 'active',
  },
  {
    title: 'Audiobook: Speed Math Mental Calculations',
    author: 'V. S. Ramanujan Institute',
    description: 'Audio guide and mental calculation tricks for high-speed arithmetic, tables, squares, and cubes.',
    price: 149,
    mrp: 299,
    section: 'audioBooks',
    isFree: false,
    language: 'hi',
    pages: 0,
    rating: 4.5,
    tags: ['speed math', 'audiobook', 'tricks'],
    status: 'active',
  },
  {
    title: 'Banking & Financial Awareness Special Edition',
    author: 'Pooja Rawat',
    description: 'RBI guidelines, monetary policy, financial terms, and recent regulatory updates for Bank PO & Clerk.',
    price: 349,
    mrp: 500,
    section: 'books',
    isFree: false,
    language: 'en',
    pages: 310,
    rating: 4.7,
    tags: ['banking awareness', 'rbi', 'finance'],
    status: 'active',
  },
  {
    title: 'General Science & Technology Handbook',
    author: 'S. N. Bose Study Group',
    description: 'NCERT based physics, chemistry, biology, and scientific developments for RRB, SSC, and state PSC exams.',
    price: 249,
    mrp: 399,
    section: 'eBooks',
    isFree: false,
    language: 'both',
    pages: 350,
    rating: 4.4,
    tags: ['science', 'railway', 'ssc', 'psc'],
    status: 'active',
  }
]

const sampleUsersData = [
  { name: 'Rahul Sharma', email: 'rahul.sharma@example.com', phone: '9876543210', role: 'user', profileComplete: true },
  { name: 'Priya Verma', email: 'priya.verma@example.com', phone: '9876543211', role: 'user', profileComplete: true },
  { name: 'Amit Kumar', email: 'amit.kumar@example.com', phone: '9876543212', role: 'user', profileComplete: true },
  { name: 'Sneha Patel', email: 'sneha.patel@example.com', phone: '9876543213', role: 'user', profileComplete: true },
  { name: 'Vikram Singh', email: 'vikram.singh@example.com', phone: '9876543214', role: 'user', profileComplete: true },
  { name: 'Neha Gupta', email: 'neha.gupta@example.com', phone: '9876543215', role: 'user', profileComplete: true },
  { name: 'Rohan Mehta', email: 'rohan.mehta@example.com', phone: '9876543216', role: 'user', profileComplete: true },
]

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)]

const randomDate = (daysAgoMax = 30) => {
  const now = new Date()
  const days = Math.random() * daysAgoMax
  const date = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return date
}

const seedBookPurchases = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI)
    rootLogger.info('Connected to MongoDB — seeding book purchase history...')

    // 1. Ensure test users exist
    let users = await User.find({ isDeleted: false })
    if (users.length < 3) {
      rootLogger.info('Not enough users found. Seeding sample users...')
      for (const u of sampleUsersData) {
        await User.findOneAndUpdate(
          { phone: u.phone },
          { $set: u },
          { upsert: true, new: true }
        )
      }
      users = await User.find({ isDeleted: false })
      rootLogger.info(`Users available: ${users.length}`)
    }

    // 2. Ensure test books exist
    let books = await Book.find({ isDeleted: false, isFree: false })
    if (books.length < 3) {
      rootLogger.info('Not enough paid books found. Seeding sample books...')
      for (const b of sampleBooksData) {
        const existingBook = await Book.findOne({ title: b.title, isDeleted: false })
        if (!existingBook) {
          await Book.create(b)
        }
      }
      books = await Book.find({ isDeleted: false, isFree: false })
      rootLogger.info(`Paid books available: ${books.length}`)
    }

    // 3. Check for --clean flag
    const shouldCleanAll = process.argv.includes('--clean')
    if (shouldCleanAll) {
      const deleteResult = await BookPurchase.deleteMany({})
      rootLogger.info(`Cleaned all existing book purchases (${deleteResult.deletedCount} deleted)`)
    } else {
      // Clean only previously seeded demo records to avoid duplicate clashes
      const deleteResult = await BookPurchase.deleteMany({ razorpayOrderId: /^order_seed_/ })
      if (deleteResult.deletedCount > 0) {
        rootLogger.info(`Cleaned ${deleteResult.deletedCount} previously seeded test purchase records`)
      }
    }

    // 4. Generate purchase history records
    const TOTAL_PURCHASES = 30
    const purchasesToInsert = []

    // Ensure at least 3-5 purchases today for "today revenue" and "today transactions" statistics
    for (let i = 0; i < TOTAL_PURCHASES; i++) {
      const user = randomItem(users)
      const book = randomItem(books)
      
      const orderId = `order_seed_${crypto.randomBytes(6).toString('hex')}`
      const paymentId = `pay_seed_${crypto.randomBytes(6).toString('hex')}`
      const signature = crypto
        .createHmac('sha256', config.RAZORPAY_KEY_SECRET || 'dummy_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex')

      // Status distribution: 75% paid, 15% pending, 10% failed
      let status = 'paid'
      const rand = Math.random()
      if (rand < 0.12) {
        status = 'failed'
      } else if (rand < 0.25) {
        status = 'pending'
      }

      // First 5 purchases created today, others across past 30 days
      let createdAt
      if (i < 5) {
        const now = new Date()
        const hoursAgo = Math.random() * 12
        createdAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000)
      } else {
        createdAt = randomDate(30)
      }

      const purchaseDoc = {
        user: user._id,
        book: book._id,
        amount: book.price || 299,
        razorpayOrderId: orderId,
        razorpayPaymentId: status === 'paid' ? paymentId : undefined,
        razorpaySignature: status === 'paid' ? signature : undefined,
        status,
        createdAt,
        updatedAt: createdAt,
      }

      purchasesToInsert.push(purchaseDoc)
    }

    const inserted = await BookPurchase.insertMany(purchasesToInsert)
    
    // Calculate summary
    const paidPurchases = inserted.filter(p => p.status === 'paid')
    const pendingPurchases = inserted.filter(p => p.status === 'pending')
    const failedPurchases = inserted.filter(p => p.status === 'failed')
    const totalRevenue = paidPurchases.reduce((acc, curr) => acc + curr.amount, 0)

    console.log('\n=============================================')
    console.log('  📚 Book Purchase History Seed Successful!  ')
    console.log('=============================================')
    console.log(`Total Seeded Records : ${inserted.length}`)
    console.log(`Paid Transactions    : ${paidPurchases.length}`)
    console.log(`Pending Transactions : ${pendingPurchases.length}`)
    console.log(`Failed Transactions  : ${failedPurchases.length}`)
    console.log(`Total Revenue Seeded : ₹${totalRevenue.toLocaleString('en-IN')}`)
    console.log(`Associated Users     : ${users.length}`)
    console.log(`Associated Books     : ${books.length}`)
    console.log('=============================================\n')

    rootLogger.info('Book purchase history seeding complete.')
    await mongoose.connection.close()
    process.exit(0)
  } catch (error) {
    rootLogger.error(error, 'Seeding book purchases failed')
    console.error('Seed error:', error)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close()
    }
    process.exit(1)
  }
}

seedBookPurchases()
