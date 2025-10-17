const User = require("../models/user.model");
const { safeUser } = require("../utils");
const { signAccessToken, signRefreshToken } = require("../utils/jwt");

module.exports = {
    login: async (req, res) => {
        try {
            const { email, password } = req.body || {};
            if (!email || !password) return res.status(400).json({ message: "email and password are required" });

            const user = await User.findOne({ email });
            if (!user) return res.status(401).json({ message: "Invalid email or password" });

            if (!user.password) {
                const withPass = await User.findOne({ email }).select("+password");
                if (!withPass) return res.status(401).json({ message: "Invalid email or password" });
                user.password = withPass.password;
            }

            const isValid = await user.comparePassword(password);
            if (!isValid) return res.status(401).json({ message: "Invalid email or password" });

            const payload = { sub: user._id.toString(), email: user.email, role: user.role };
            const accessToken = signAccessToken(payload);
            const refreshToken = signRefreshToken(payload);

            return res.json({
                message: "Logged in",
                data: {
                    user: safeUser(user),
                    token: { accessToken, refreshToken }
                }
            });
        } catch (err) {
            console.error("[login] error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    register: async (req, res) => {
        try {
            const { name, email, password, phone, role } = req.body || {};
            if (!name || !email || !password) {
                return res.status(400).json({ message: "name, email, password are required" });
            }

            const exists = await User.findOne({ email });
            if (exists) return res.status(409).json({ message: "Email already registered" });

            const user = await User.create({ name, email, password, phone, role });

            const payload = { sub: user._id.toString(), email: user.email, role: user.role };
            const accessToken = signAccessToken(payload);
            const refreshToken = signRefreshToken(payload);

            return res.status(201).json({
                message: "Registered successfully",
                data: {
                    user: safeUser(user),
                    token: { accessToken, refreshToken }
                }
            });
        } catch (err) {
            if (err?.code === 11000) return res.status(409).json({ message: "Email already registered" });
            return res.status(500).json({ message: "Internal server error" });
        }
    },
    getMe: async (req, res, next) => {
        const user = res.locals.user;

        res.status(200).json({
            msg: "Get user infomation successful",
            data: user
        });
    }
};
