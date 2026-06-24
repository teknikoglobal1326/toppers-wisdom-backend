require('dotenv').config()
const mongoose      = require('mongoose')
const config        = require('../config/env')
const Qualification = require('../models/Qualification.model')
const ExamType      = require('../models/ExamType.model')
const SubExam       = require('../models/SubExam.model')
const User          = require('../models/User.model')
const { rootLogger } = require('../config/logger')

const seed = async () => {
  await mongoose.connect(config.MONGODB_URI)
  rootLogger.info('Connected — seeding...')

  await Promise.all([Qualification.deleteMany(), ExamType.deleteMany(), SubExam.deleteMany()])

  const graduate = await Qualification.create({ name: 'Graduate',      slug: 'graduate',      sortOrder: 1 })
  const tenth    = await Qualification.create({ name: '10th Pass',     slug: '10th-pass',     sortOrder: 2 })
  const postGrad = await Qualification.create({ name: 'Post Graduate', slug: 'post-graduate', sortOrder: 3 })

  const banking = await ExamType.create({ qualification: graduate._id,  name: 'Banking',         slug: 'banking',    sortOrder: 1 })
  const ssc     = await ExamType.create({ qualification: graduate._id,  name: 'SSC',             slug: 'ssc',        sortOrder: 2 })
  const railway = await ExamType.create({ qualification: graduate._id,  name: 'Railway',         slug: 'railway',    sortOrder: 3 })
  const upsc    = await ExamType.create({ qualification: postGrad._id,  name: 'UPSC',            slug: 'upsc',       sortOrder: 4 })
  const defence = await ExamType.create({ qualification: graduate._id,  name: 'Defence',         slug: 'defence',    sortOrder: 5 })
  const railGD  = await ExamType.create({ qualification: tenth._id,     name: 'Railway Group D', slug: 'railway-gd', sortOrder: 6 })

  await SubExam.insertMany([
    { examType: banking._id,  name: 'IBPS PO',     slug: 'ibps-po',      sortOrder: 1 },
    { examType: banking._id,  name: 'IBPS Clerk',  slug: 'ibps-clerk',   sortOrder: 2 },
    { examType: banking._id,  name: 'SBI PO',      slug: 'sbi-po',       sortOrder: 3 },
    { examType: banking._id,  name: 'SBI Clerk',   slug: 'sbi-clerk',    sortOrder: 4 },
    { examType: banking._id,  name: 'RBI Grade B', slug: 'rbi-grade-b',  sortOrder: 5 },
    { examType: ssc._id,      name: 'SSC CGL',     slug: 'ssc-cgl',      sortOrder: 1 },
    { examType: ssc._id,      name: 'SSC CHSL',    slug: 'ssc-chsl',     sortOrder: 2 },
    { examType: ssc._id,      name: 'SSC MTS',     slug: 'ssc-mts',      sortOrder: 3 },
    { examType: ssc._id,      name: 'SSC CPO',     slug: 'ssc-cpo',      sortOrder: 4 },
    { examType: ssc._id,      name: 'SSC GD',      slug: 'ssc-gd',       sortOrder: 5 },
    { examType: railway._id,  name: 'RRB NTPC',    slug: 'rrb-ntpc',     sortOrder: 1 },
    { examType: railway._id,  name: 'RRB ALP',     slug: 'rrb-alp',      sortOrder: 2 },
    { examType: upsc._id,     name: 'UPSC CSE',    slug: 'upsc-cse',     sortOrder: 1 },
    { examType: upsc._id,     name: 'UPSC CDS',    slug: 'upsc-cds',     sortOrder: 2 },
    { examType: upsc._id,     name: 'UPSC CAPF',   slug: 'upsc-capf',    sortOrder: 3 },
    { examType: defence._id,  name: 'NDA',         slug: 'nda',          sortOrder: 1 },
    { examType: railGD._id,   name: 'RRB Group D', slug: 'rrb-group-d',  sortOrder: 1 },
  ])

  if (config.ADMIN_PHONE) {
    await User.findOneAndUpdate(
      { phone: config.ADMIN_PHONE },
      { phone: config.ADMIN_PHONE, role: 'admin', profileComplete: true, name: 'Admin' },
      { upsert: true }
    )
    rootLogger.info({ phone: config.ADMIN_PHONE }, 'Admin user seeded')
  }

  rootLogger.info('Seed complete')
  await mongoose.connection.close()
  process.exit(0)
}

seed().catch((err) => { rootLogger.error(err, 'Seed failed'); process.exit(1) })
