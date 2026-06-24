/**
 * Wraps any async Express route handler and forwards errors to next().
 * Eliminates try/catch from EVERY controller function.
 *
 * Before (without catchAsync):
 *   const getMe = async (req, res, next) => {
 *     try {
 *       const user = await userService.getMe(req.user._id)
 *       sendSuccess(res, user)
 *     } catch (err) {
 *       next(err)   // must repeat this in every function
 *     }
 *   }
 *
 * After (with catchAsync):
 *   const getMe = catchAsync(async (req, res) => {
 *     const user = await userService.getMe(req.user._id)
 *     sendSuccess(res, user)
 *   })
 *
 * Usage: wrap every controller function with catchAsync.
 * Any thrown error (AppError or unexpected) is automatically forwarded to errorHandler.
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = catchAsync