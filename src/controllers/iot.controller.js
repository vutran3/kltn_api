const iotService = require("../services/iot.service");
const { buildReadingFromBody, parseDateMaybe } = require("../utils");

module.exports = {
    collectReadingData: async (req, res, next) => {
        try {
            const b = req.body || {};
            // if (!b.deviceId) {
            //     return res.status(400).json({ error: "deviceId is required" });
            // }
            const nowMs = Date.now();
            const tsMs = typeof b.ts === "number" ? b.ts : nowMs;
            const ts = new Date(tsMs);

            const deviceId = String(b.deviceId);
            const reading = buildReadingFromBody(b, ts);

            // Ghi vào bucket
            const saved = await iotService.addReadingToBucket(deviceId, reading);

            return res.status(201).json({
                status: 201,
                data: saved,
                msg: "Collect reading data (bucket) successful"
            });
        } catch (error) {
            next(error);
        }
    },

    // Nếu có from/to: trả readings trong [from, to)
    // Nếu không có from/to: trả N mẫu mới nhất theo sort
    getReadingData: async (req, res, next) => {
        try {
            const deviceId = req.query.deviceId;
            if (!deviceId) {
                return res.status(400).json({ error: "deviceId query is required" });
            }

            const from = parseDateMaybe(req.query.from);
            const to = parseDateMaybe(req.query.to);
            const sort = parseInt(req.query.sort || "-1", 10);
            const limitReq = parseInt(req.query.limit || "50", 10);
            const limit = Math.min(Number.isFinite(limitReq) ? limitReq : 50, 500);

            const rows = await iotService.getSensorData({
                deviceId,
                from,
                to,
                limit,
                sort
            });

            res.status(200).json({
                status: 200,
                msg: "Get reading data (bucket) successful",
                data: {
                    deviceId,
                    count: rows.length,
                    rows,
                    range: from && to ? { from, to } : undefined
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // GET /iot/readings/latest?deviceId=...
    getLatestReadingData: async (req, res, next) => {
        try {
            const deviceId = req.query.deviceId;
            if (!deviceId) {
                return res.status(400).json({ error: "deviceId query is required" });
            }

            const last = await iotService.getLatestSensorData({ deviceId });

            res.status(200).json({
                status: 200,
                data: { deviceId, last },
                msg: "Get latest reading data (bucket) successful"
            });
        } catch (error) {
            next(error);
        }
    }
};
