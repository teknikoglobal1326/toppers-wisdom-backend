const mongoose = require("mongoose");

const userEditorialLikeSchema = new mongoose.Schema({

 userId:{ type:mongoose.Schema.Types.ObjectId, ref:"User", required:true },
 editorialId:{ type:mongoose.Schema.Types.ObjectId, ref:"Editorial", required:true },
 isLiked:{ type:Boolean, default:false }},
{ timestamps:true });

userEditorialLikeSchema.index({ userId:1, editorialId:1 }, { unique:true });
module.exports = mongoose.model("UserEditorialLike", userEditorialLikeSchema);
