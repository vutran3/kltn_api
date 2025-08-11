const { toNumberOrUndefined, toReadingDataResponse } = require("../utils");
const iotService = require("../services/iot.service");

module.exports = {
    collectReadingData: async (req, res, next) => {
        try {
            const b = req.body || {};

            const nowMs = Date.now();
            const tsMs = typeof b.ts === "number" ? b.ts : nowMs;
            const ts = new Date(tsMs);

            const doc = {
                deviceId: String(b.deviceId),
                ts,
                rainRaw: toNumberOrUndefined(b.rainRaw),
                wetPct: toNumberOrUndefined(b.wetPct),
                raining: toNumberOrUndefined(b.raining),
                lightRaw: toNumberOrUndefined(b.lightRaw),
                lightPct: toNumberOrUndefined(b.lightPct),
                lightVolt: toNumberOrUndefined(b.lightVolt),
                ip: req.ip
            };

            const sensorData = await iotService.createSensorData(doc);

            return res.status(201).json({
                status: 201,
                data: sensorData,
                msg: "Collect reading data successful"
            });
        } catch (error) {
            next(error);
        }
    },

    getReadingData: async (req, res, next) => {
        try {
            const deviceId = req.query.deviceId;
            if (!deviceId) return res.status(400).json({ error: "deviceId query is required" });

            const limitReq = parseInt(req.query.limit || "50", 10);
            const limit = Math.min(Number.isFinite(limitReq) ? limitReq : 50, 500);

            const rows = await iotService.getSensorData({
                deviceId,
                limit,
                sort: -1
            });

            const normalized = rows.map((r) => toReadingDataResponse(r));

            res.status(200).json({
                status: 200,
                msg: "Get reading data successful",
                data: {
                    deviceId,
                    count: normalized.length,
                    rows: normalized
                }
            });
        } catch (error) {
            next(error);
        }
    },

    getLatestReadingData: async (req, res, next) => {
        try {
            const deviceId = req.query.deviceId;
            if (!deviceId) return res.status(400).json({ error: "deviceId query is required" });

            const readingData = await iotService.getLatestSensorData({
                deviceId,
                sort: -1
            });

            const last = readingData ? toReadingDataResponse(readingData) : null;

            res.status(200).json({
                status: 200,
                data: { deviceId, last },
                msg: "Get latest reading data successful"
            });
        } catch (error) {
            next(error);
        }
    }
};
