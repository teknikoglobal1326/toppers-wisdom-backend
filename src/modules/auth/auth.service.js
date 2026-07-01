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
const payload = {
    _id: user._id,
    phone: user.phone,
    role: user.role,
    examTypeId: user.examType?._id || null,
    subExamId: user.subExam?._id || null,
  }
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

  const payload = {
    _id: user._id,
    phone: user.phone,
    role: user.role,
    examTypeId: user.examType?._id || null,
    subExamId: user.subExam?._id || null,
  }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken({ _id: user._id })

  return { accessToken, refreshToken, user, isNewUser }
}

const refreshToken = async (token) => {
  const payload = verifyRefreshToken(token)
  // uses BaseRepository.findByIdOrFail — throws 401 if not found
  const user = await authRepository.findByIdOrFail(payload._id, 'User not found')
  const accessToken = signAccessToken({
    _id: user._id,
    phone: user.phone,
    role: user.role,
    examTypeId: user.examType?._id || null,
    subExamId: user.subExam?._id || null,
  })
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
  const qual = await qualificationRepository.findByIdOrFail(payload.qualification, 'Qualification not found')

  const updateData = {
    name: payload.name,
    qualification: { _id: qual._id, name: qual.name },
    language: payload.language,
    profileCompletionState: 'profileUpdated',
    profileComplete: true
  }

  if (payload.email) {
    updateData.email = payload.email
  }

  const updatedUser = await authRepository.updateById(userId, updateData)

  logger.info({ userId }, 'User profile updated')

  return {
    profileCompletionState: updatedUser.profileCompletionState,
    profileComplete: updatedUser.profileComplete
  }
}

module.exports = { sendOtp, verifyOtpAndLogin, refreshToken, logout, updatePassword, updateProfile }