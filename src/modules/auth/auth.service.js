const authRepository = require('./auth.repository')
const { generateOtp, storeOtp, verifyOtp, checkRateLimit } = require('../../lib/otp')
const { sendOtpSms } = require('../../lib/sms')
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../../lib/jwt')
const AppError = require('../../core/AppError')
const redis = require('../../config/redis')
const bcrypt = require('bcryptjs')
const { createLogger } = require('../../config/logger')

const logger = createLogger('auth:service')

const sendOtp = async (phone) => {
  logger.info({ phone }, 'OTP send requested')

  const user = await authRepository.findByPhone(phone)
  const isNewUser = !user || user.profileCompletionState === 'otpsended'

  if (!isNewUser) {
    logger.info({ phone }, 'Old user, skipping OTP')
    const payload = { _id: user._id, phone: user.phone, role: user.role, qualificationId: user.qualification?._id || null, examId: user.exam?._id || null, subExamIds: (user.subExams || []).map((s) => s._id) }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken({ _id: user._id })

    return {
      message: 'User already exists, OTP skipped',
      isNewUser: false,
      profileCompletionState: user.profileCompletionState,
      profileComplete: user.profileComplete,
      accessToken,
      refreshToken
    }
  }

  await checkRateLimit(phone)
  // const otp = generateOtp()
  const otp = '1234'
  await storeOtp(phone, otp)
  await sendOtpSms(phone, otp)

  const updatedUser = await authRepository.upsert({ phone }, { profileCompletionState: 'otpsended' })

  logger.info({ phone }, 'OTP sent')
  return {
    message: 'OTP sent successfully',
    isNewUser: true,
    profileCompletionState: updatedUser.profileCompletionState,
    profileComplete: updatedUser.profileComplete,
    accessToken: '',
    refreshToken: ''
  }
}

const verifyOtpAndLogin = async (phone, otp) => {
  logger.info({ phone }, 'Login attempt')
  await verifyOtp(phone, otp)

  let user = await authRepository.findByPhone(phone)
  const isNewUser = !user || user.profileCompletionState === 'otpsended'

  if (isNewUser) {
    if (!user) {
      user = await authRepository.create({ phone, role: 'user', profileCompletionState: 'verifyOtp' })
    } else {
      user = await authRepository.updateById(user._id, { profileCompletionState: 'verifyOtp' })
    }
    logger.info({ phone, userId: user._id }, 'New user registered')
  } else {
    logger.info({ phone, userId: user._id }, 'Existing user logged in')
  }

  const payload = { _id: user._id, phone: user.phone, role: user.role, qualificationId: user.qualification?._id || null, examId: user.exam?._id || null, subExamIds: (user.subExams || []).map((s) => s._id) }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken({ _id: user._id })

  return { accessToken, refreshToken, user, isNewUser }
}

const refreshToken = async (token) => {
  const payload = verifyRefreshToken(token)
  // uses BaseRepository.findByIdOrFail — throws 401 if not found
  const user = await authRepository.findByIdOrFail(payload._id, 'User not found')
  const accessToken = signAccessToken({ _id: user._id, phone: user.phone, role: user.role, examId: user.exam?._id || null, subExamIds: (user.subExams || []).map((s) => s._id) })
  logger.info({ userId: user._id }, 'Token refreshed')
  return { accessToken }
}

const logout = async (token) => {
  const decoded = require('jsonwebtoken').decode(token)
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
  }
  logger.info({ userId: decoded?._id }, 'User logged out')
}

const updatePassword = async (userId, password) => {
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  const updatedUser = await authRepository.updateById(userId, {
    password: hashedPassword,
    plainPassword: password,
    profileCompletionState: 'passwordCreated'
  })

  logger.info({ userId }, 'User password updated')
  
  return {
    profileCompletionState: updatedUser.profileCompletionState,
    profileComplete: updatedUser.profileComplete
  }
}

const updateProfile = async (userId, payload) => {
  const qualificationRepository = require('../qualification/qualification.repository')
  const examRepository = require('../exam/exam.repository')
  const subExamRepository = require('../subexam/subexam.repository')

  const currentUser = await authRepository.findByIdOrFail(userId, 'User not found')
  const alreadyComplete = currentUser.profileComplete === true

  const updateData = {}

  if (payload.name) {
    updateData.name = payload.name
  }

  if (payload.email) {
    updateData.email = payload.email
  }

  if (payload.language) {
    updateData.language = payload.language
  }

  if (payload.avatar) {
    updateData.avatar = payload.avatar
  }

  if (payload.qualification) {
    const qual = await qualificationRepository.findByIdOrFail(payload.qualification, 'Qualification not found')
    updateData.qualification = { _id: qual._id, name: qual.name }
  }

  if (payload.examId) {
    const exam = await examRepository.findByIdOrFail(payload.examId, 'Exam not found')
    updateData.exam = { _id: exam._id, name: exam.name }
  }

  if (payload.subexamIds?.length) {
    const subExams = await Promise.all(
      payload.subexamIds.map((id) => subExamRepository.findByIdOrFail(id, 'Sub-exam not found'))
    )
    updateData.subExams = subExams.map((s) => ({ _id: s._id, name: s.name }))
  }

  if (!alreadyComplete) {
    // Mark onboarding as complete when name + qualification are present along with avatar or language
    if (payload.name && payload.qualification && (payload.avatar || payload.language)) {
      updateData.profileCompletionState = 'onboardingCompleted'
      updateData.profileComplete = true
    }

    // Mark profile as fully complete when exam and subExams are set
    if (payload.examId && payload.subexamIds?.length) {
      updateData.profileCompletionState = 'profileFullCompleted'
      updateData.profileComplete = true
    }
  }

  const updatedUser = await authRepository.updateById(userId, updateData)

  logger.info({ userId }, 'User profile updated')

  return {
    profileCompletionState: updatedUser.profileCompletionState,
    profileComplete: updatedUser.profileComplete
  }
}

const getProfile = async (userId) => {
  const user = await authRepository.findByIdOrFail(userId, 'User not found')
  logger.info({ userId }, 'User profile fetched')
  const { password, plainPassword, fcmToken, savedItems, reportedItems, isDeleted, deletedAt, ...profile } = user
  return profile
}

const deleteAccount = async (userId, token) => {
  await authRepository.updateById(userId, {
    isDeleted: true,
    deletedAt: new Date(),
  })

  // invalidate the current token so it can't be reused
  const decoded = require('jsonwebtoken').decode(token)
  if (decoded?.exp) {
    const ttl = decoded.exp - Math.floor(Date.now() / 1000)
    if (ttl > 0) await redis.set(`blacklist:${token}`, '1', 'EX', ttl)
  }

  logger.info({ userId }, 'User account deleted')
}

const loginWithPassword = async (phone, password) => {
  const user = await authRepository.findByPhone(phone)

  const isNewUser = !user || user.profileCompletionState === 'otpsended'
  if (isNewUser) {
    throw new AppError('User not found. Please register first.', 404, 'USER_NOT_FOUND')
  }

  if (!user.profileComplete) {
    throw new AppError('Please complete your profile before logging in', 403, 'PROFILE_INCOMPLETE')
  }

  if (!user.password) {
    throw new AppError('Password not set. Please use OTP to login.', 400, 'PASSWORD_NOT_SET')
  }

  const isMatch = await bcrypt.compare(password, user.password)
  if (!isMatch) {
    throw new AppError('Invalid phone number or password', 401, 'INVALID_CREDENTIALS')
  }

  const payload = { _id: user._id, phone: user.phone, role: user.role, qualificationId: user.qualification?._id || null, examId: user.exam?._id || null, subExamIds: (user.subExams || []).map((s) => s._id) }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken({ _id: user._id })

  logger.info({ userId: user._id }, 'User logged in with password')
  return { accessToken, refreshToken, isNewUser: false, profileCompletionState: user.profileCompletionState, profileComplete: user.profileComplete }
}

module.exports = { sendOtp, verifyOtpAndLogin, refreshToken, logout, updatePassword, updateProfile, getProfile, loginWithPassword, deleteAccount }