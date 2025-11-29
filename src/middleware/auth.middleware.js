const { verifyAccessToken, signAccessToken, verifyRefreshToken } = require("../utils/jwt");
const createError = require("http-errors");
const User = require("../models/user.model");
const { safeUser } = require("../utils");

const auth = async (req, res, next) => {
    try {
        const token = req.headers["authorization"];
        const userId = req.headers["x-client-id"];
        console.log({
            token,
            userId
        });

        if (!token) throw createError.Unauthorized("Vui lòng đăng nhập");
        if (!userId) throw createError.BadRequest("Người dùng không hợp lệ");

        const accessToken = token.split(" ")[1];
        if (!accessToken) throw createError.Unauthorized("Vui lòng đăng nhập");

        const { isExpired, error, data } = await verifyAccessToken(accessToken);

        if (data) {
            const user = await User.findById(userId);
            if (!user) throw createError.Unauthorized("Người dùng không tồn tại");
            res.locals.user = safeUser(user);
            next();
        }

        if (isExpired) {
            const refreshToken = req.headers["x-refresh"];
            if (!refreshToken) throw createError.Unauthorized("Vui lòng đăng nhập");

            const { error } = await verifyRefreshToken(refreshToken);
            if (error) throw createError.Unauthorized("Vui lòng đăng nhập");

            const user = await User.findById(userId);
            if (!user) throw createError.NotFound("Người dùng không dùng tại");
            const payload = { sub: user._id.toString(), email: user.email, role: user.role };

            const accessToken = signAccessToken(payload);

            return res.status(401).json({
                message: "Unauthorized",
                data: {
                    accessToken
                }
            });
        }

        if (error) {
            console.log(error);
            throw createError.BadRequest("Xác thực người dùng lỗi");
        }
    } catch (error) {
        next(error);
    }
};

module.exports = auth;
