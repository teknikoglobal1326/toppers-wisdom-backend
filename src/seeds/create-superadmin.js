require('dotenv').config()
const readline = require('readline')
const mongoose = require('mongoose')
const config   = require('../config/env')
const Admin    = require('../models/Admin.model')
const { rootLogger } = require('../config/logger')

const ask = (rl, question) =>
  new Promise((resolve) => rl.question(question, resolve))

const askPassword = (question) =>
  new Promise((resolve) => {
    process.stdout.write(question)

    if (!process.stdin.isTTY) {
      let value = ''
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.once('data', (data) => {
        value = data.toString().trim()
        process.stdin.pause()
        process.stdout.write('\n')
        resolve(value)
      })
      return
    }

    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    let value = ''
    const onData = (char) => {
      const code = char.charCodeAt(0)
      if (code === 3) {
        process.exit()
      } else if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(value)
      } else if (code === 127) {
        value = value.slice(0, -1)
      } else {
        value += char
      }
    }
    process.stdin.on('data', onData)
  })

const run = async () => {
  await mongoose.connect(config.MONGODB_URI)
  rootLogger.info('Connected to MongoDB')

  const existing = await Admin.findOne({ role: 'superadmin' })
  if (existing) {
    console.log(`\nA superadmin already exists: ${existing.email}`)
    console.log('To create another admin, use the admin panel.\n')
    await mongoose.connection.close()
    process.exit(0)
  }

  console.log('\n=== Create First Superadmin ===\n')

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const name  = (await ask(rl, 'Name:     ')).trim()
  const email = (await ask(rl, 'Email:    ')).trim().toLowerCase()
  rl.close()

  const password = await askPassword('Password: ')

  if (!name || !email || !password) {
    console.error('\nAll fields are required.')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('\nPassword must be at least 8 characters.')
    process.exit(1)
  }

  const admin = await Admin.create({ name, email, password, role: 'superadmin' })

  console.log('\nSuperadmin created successfully!')
  console.log(`  ID:    ${admin._id}`)
  console.log(`  Name:  ${admin.name}`)
  console.log(`  Email: ${admin.email}\n`)

  await mongoose.connection.close()
  process.exit(0)
}

run().catch((err) => {
  console.error('\nFailed:', err.message)
  process.exit(1)
})