const mongoose = require("mongoose");

const userEditorialLikeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    editorialId: { type: mongoose.Schema.Types.ObjectId, ref: "Editorial", required: true, index: true },
    isLiked: { type: Boolean, default: false },
    isRead: { type: Boolean, default: false, index: true },
    isBookmarked: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    bookmarkedAt: { type: Date, default: null }
},
    { timestamps: true });

userEditorialLikeSchema.index({ userId: 1, editorialId: 1 }, { unique: true });
userEditorialLikeSchema.index({ userId: 1, isRead: 1, isBookmarked: 1 });
module.exports = mongoose.model("UserEditorialLike", userEditorialLikeSchema);
