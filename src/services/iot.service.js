const { ReadingBucket } = require("../models/reading.model");

/**
 * Ghi 1 mẫu đọc vào bucket theo deviceId + ts (upsert)
 * @param {string} deviceId
 * @param {object} reading  { t: Date, ...metrics }
 * @param {object} [options] { bucketMs?: number, keepRaw?: boolean }
 */
async function addReadingToBucket(deviceId, reading, options = {}) {
    try {
        await ReadingBucket.addReading(deviceId, reading, options);
        const last = await ReadingBucket.getLatest(deviceId);
        return last || reading;
    } catch (err) {
        throw err;
    }
}

/**
 * Truy vấn dữ liệu thô theo khoảng thời gian [from, to).
 * Nếu không truyền from/to, sẽ lấy N mẫu mới nhất.
 * @param {object} params { deviceId, from?, to?, limit?, sort? }
 * sort: 1 (tăng dần) | -1 (giảm dần), mặc định -1
 */
async function getSensorData({ deviceId, from, to, limit, sort = -1 }) {
    try {
        // Case A: Có from/to
        if (from instanceof Date && to instanceof Date) {
            const rows = await ReadingBucket.queryRange(deviceId, from, to);
            if (sort === -1) rows.reverse();
            return rows;
        }

        // Case B: Không có from/to
        const lim = Math.min(Number.isFinite(+limit) ? +limit : 50, 500);
        const s = sort === 1 ? 1 : -1;

        const rows = await ReadingBucket.aggregate([
            { $match: { deviceId: String(deviceId) } },
            { $unwind: "$readings" },
            { $sort: { "readings.t": s } },
            { $limit: lim },
            {
                $project: {
                    _id: 0,
                    t: "$readings.t",
                    airTemperature: "$readings.airTemperature",
                    airHumidity: "$readings.airHumidity",
                    lightRaw: "$readings.lightRaw",
                    rainRaw: "$readings.rainRaw",
                    soilTemperature: "$readings.soilTemperature",
                    soilHumidity: "$readings.soilHumidity",
                    nitrogen: "$readings.nitrogen",
                    phosphorus: "$readings.phosphorus",
                    potassium: "$readings.potassium",
                    ph: "$readings.ph"
                }
            }
        ]);

        return rows;
    } catch (err) {
        throw err;
    }
}

// Lấy mẫu gần nhất (last) theo deviceId
async function getLatestSensorData({ deviceId }) {
    try {
        const last = await ReadingBucket.getLatest(String(deviceId));
        return last;
    } catch (err) {
        throw err;
    }
}

module.exports = {
    addReadingToBucket,
    getSensorData,
    getLatestSensorData
};
