require('dotenv').config({ path: 'e:/TeknikoBackend/toppers-wisdom-backend/.env' })
const mongoose = require('mongoose')
const toppersWisdomService = require('../src/modules/thought-of-the-day/thought-of-the-day.service')
const ThoughtOfTheDay = require('../src/models/ThoughtOfTheDay.model')
const TWPost = require('../src/models/TWPost.model')

async function main() {
  console.log('Connecting to database...')
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected!')

  try {
    // 1. Let's inspect counts in the database
    const thoughtCount = await ThoughtOfTheDay.countDocuments({ isDeleted: false, status: 'active' })
    const postCount = await TWPost.countDocuments({ isDeleted: false, status: 'active' })
    console.log(`Active thoughts in DB: ${thoughtCount}`)
    console.log(`Active posts in DB: ${postCount}`)

    // Create dummy data if none exists so we can verify the service
    if (thoughtCount === 0) {
      console.log('Creating a dummy thought of the day...')
      await ThoughtOfTheDay.create({
        quote: 'The only way to do great work is to love what you do.',
        authorName: 'Steve Jobs',
        publishDate: new Date(),
        status: 'active',
        isDeleted: false
      })
    }

    if (postCount === 0) {
      console.log('Creating a dummy TW post...')
      await TWPost.create({
        type: 'text',
        title: 'Introduction to Toppers Wisdom',
        shortDescription: 'Welcome to the platform where you learn from the best.',
        textContent: 'Here is some text content for the post.',
        status: 'active',
        isDeleted: false
      })
    }

    // 2. Fetch the feed with pagination limit 5
    console.log('\n--- Testing listFeed (Page 1, Limit 5) ---')
    const feed = await toppersWisdomService.listFeed({ page: 1, limit: 5 })
    console.log('Pagination:', feed.pagination)
    console.log('Feed items:')
    feed.data.forEach((item, index) => {
      console.log(`[${index + 1}] Type: ${item.itemType} | Date: ${item.createdAt}`)
      if (item.itemType === 'thought') {
        console.log(`    Author: ${item.authorName} | Quote: "${item.quote}"`)
      } else {
        console.log(`    Title: ${item.title} | Desc: "${item.shortDescription}"`)
      }
    })

    // 3. Test Search filtering
    console.log('\n--- Testing Search for "Steve" ---')
    const searchSteve = await toppersWisdomService.listFeed({ page: 1, limit: 5, search: 'Steve' })
    console.log(`Search result count: ${searchSteve.data.length}`)
    searchSteve.data.forEach(item => {
      console.log(` - Type: ${item.itemType} | Author: ${item.authorName || 'N/A'} | Title: ${item.title || 'N/A'}`)
    })

    console.log('\n--- Testing Search for "Introduction" ---')
    const searchIntro = await toppersWisdomService.listFeed({ page: 1, limit: 5, search: 'Introduction' })
    console.log(`Search result count: ${searchIntro.data.length}`)
    searchIntro.data.forEach(item => {
      console.log(` - Type: ${item.itemType} | Author: ${item.authorName || 'N/A'} | Title: ${item.title || 'N/A'}`)
    })

  } catch (error) {
    console.error('Error occurred:', error)
  } finally {
    await mongoose.disconnect()
    console.log('Database disconnected.')
  }
}

main()
