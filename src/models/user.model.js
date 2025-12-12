const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

const [COL, DOC] = ["users", "User"];
const UserSchema = new mongoose.Schema(
    {
        name: { type: String, trim: true, required: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },
        role: { type: String, trim: true, default: "user" },
        phone: { type: String, trim: true },
        isActive: { type: Boolean, default: true }
    },
    {
        collection: COL,
        timestamps: true
    }
);

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
        return next();
    } catch (err) {
        return next(err);
    }
});

UserSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

const User = mongoose.model(DOC, UserSchema);

module.exports = User;
