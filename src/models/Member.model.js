const mongoose  = require("mongoose");
const bcrypt = require("bcryptjs");

const memberSchema = new mongoose.Schema({

    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, trim: true, required: true },
    phone: { type: Number, default: null, trim: true },
    password: { type: String, required: true },
    role: {  type: mongoose.Schema.Types.ObjectId, ref: "Role" },
    profileImage: { type: String, trim: true, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type : Boolean, default: false },
}, { timestamps: true });


// Hash password before save
memberSchema.pre("save", async function(next){
    if(!this.isModified("password")){ return next(); }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash( this.password, salt );
    next();
});

// Compare password during login
memberSchema.methods.comparePassword = async function(password){
    return await bcrypt.compare( password, this.password )};

memberSchema.index({ sortOrder: 1 });
module.exports = mongoose.model("Member", memberSchema);