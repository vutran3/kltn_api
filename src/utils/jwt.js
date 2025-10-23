const { TokenExpiredError } = require("jsonwebtoken");
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;

function signAccessToken(payload) {
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

async function verifyAccessToken(token) {
    return new Promise((resolve, _) => {
        jwt.verify(token, ACCESS_TOKEN_SECRET, (err, data) => {
            if (err) {
                resolve({
                    isExpired: err instanceof TokenExpiredError,
                    error: err,
                    data: null
                });
            }

            resolve({
                isExpired: false,
                error: null,
                data
            });
        });
    });
}

async function verifyRefreshToken(token) {
    return new Promise((resolve, _) => {
        jwt.verify(token, REFRESH_TOKEN_SECRET, (err, data) => {
            if (err) {
                console.log(err);
                resolve({
                    error: err,
                    data: null
                });
            }

            resolve({
                error: null,
                data
            });
        });
    });
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
