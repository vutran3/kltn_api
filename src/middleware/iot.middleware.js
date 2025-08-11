const createError = require("http-errors");

module.exports = {
    validateReading(req, res, next) {
        try {
            const body = req.body;

            if (!body.deviceId) throw createError.BadRequest("deviceId is required");

            const numFields = ["ts", "rainRaw", "wetPct", "raining", "lightRaw", "lightPct", "lightVolt"];
            for (const f of numFields) {
                if (body[f] !== undefined && typeof body[f] !== "number") {
                    throw createError.BadRequest(`${f} must be number`);
                }
            }

            if (body.raining !== undefined && ![0, 1].includes(body.raining))
                throw createError.BadRequest("raining must be 0 or 1");

            next();
        } catch (error) {
            next(error);
        }
    }
};
