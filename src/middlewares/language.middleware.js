const languageMiddleware = (req, _res, next) => {
  req.lang = req.user?.language || (req.headers['accept-language']?.startsWith('hi') ? 'hi' : 'en') || 'hi'
  next()
}
module.exports = { languageMiddleware }