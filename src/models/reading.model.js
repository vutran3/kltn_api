const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Cấu hình bucket
 * - BUCKET_MS: độ rộng bucket (default: 1 hour)
 * - RETENTION_DAYS: số ngày giữ dữ liệu (TTL)
 */
const BUCKET_MS = Number(process.env.BUCKET_MS || 60 * 60 * 1000);
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS || 180);
const METRICS = [
    "air_temperature",
    "air_humidity",
    "light_raw",
    "soil_temperature",
    "soil_humidity",
    "nitrogen",
    "phosphorus",
    "potassium",
    "ph"
];

const ReadingSchema = new Schema(
    {
        // timestamp
        t: { type: Date, required: true },
        air_temperature: { type: Number },
        air_humidity: { type: Number },
        light_raw: { type: Number },
        rainRaw: { type: Number, enum: [0, 1] },
        soil_temperature: { type: Number },
        soil_humidity: { type: Number },
        nitrogen: { type: Number },
        phosphorus: { type: Number },
        potassium: { type: Number },
        ph: { type: Number, min: 0, max: 14 }
    },
    { _id: false }
);

// Subdoc: thống kê tổng hợp theo metric
const StatsSchema = new Schema(
    {
        // Ví dụ: min.air_temperature, max.air_temperature, sum.air_temperature, counts.air_temperature
    },
    { strict: false, _id: false }
);

const ReadingBucketSchema = new Schema(
    {
        deviceId: { type: String, index: true, required: true },
        bucketStart: { type: Date, index: true, required: true },
        bucketEnd: { type: Date, required: true },
        bucketWidthMs: { type: Number, required: true, default: BUCKET_MS },
        expiresAt: { type: Date, index: { expireAfterSeconds: 0 } }, // TTL
        count: { type: Number, default: 0 },
        min: { type: StatsSchema, default: {} },
        max: { type: StatsSchema, default: {} },
        sum: { type: StatsSchema, default: {} },
        counts: { type: StatsSchema, default: {} },
        // Lần đo gần nhất trong bucket
        last: { type: ReadingSchema, default: null },
        // Mảng mẫu (nếu cần truy vấn chi tiết)
        readings: { type: [ReadingSchema], default: [] }
    },
    {
        collection: "reading_buckets",
        timestamps: true
    }
);

// Ràng buộc duy nhất cho (deviceId, bucketStart)
ReadingBucketSchema.index({ deviceId: 1, bucketStart: 1 }, { unique: true });

// Helper: tính bucketStart theo BUCKET_MS
function floorToBucket(ts, bucketMs = BUCKET_MS) {
    const t = ts instanceof Date ? ts.getTime() : Number(ts);
    return new Date(Math.floor(t / bucketMs) * bucketMs);
}

// Helper: tạo expiresAt theo retention
function makeExpiresAt(bucketStart) {
    const ms = RETENTION_DAYS * 24 * 60 * 60 * 1000;
    return new Date(bucketStart.getTime() + ms);
}

// Xây dựng các toán tử update ($min/$max/$inc/$set) dựa trên reading vào
function buildUpdateOperators(reading) {
    const $min = {};
    const $max = {};
    const $inc = { count: 1 };
    const $set = { last: reading };

    // với mỗi metric có mặt trong reading, cập nhật min/max/sum/counts
    METRICS.forEach((m) => {
        if (typeof reading[m] === "number") {
            $min[`min.${m}`] = reading[m];
            $max[`max.${m}`] = reading[m];
            $inc[`counts.${m}`] = 1;
            if (!$inc[`sum.${m}`]) $inc[`sum.${m}`] = 0;
            $inc[`sum.${m}`] += reading[m]; // tổng
        }
    });

    return { $min, $max, $inc, $set };
}

/**
 * Thêm 1 mẫu đo vào bucket tương ứng (upsert)
 * @param {string} deviceId
 * @param {object} reading { t: Date, ...metrics }
 * @param {object} options { bucketMs, keepRaw }
 */
ReadingBucketSchema.statics.addReading = async function addReading(deviceId, reading, options = {}) {
    if (!reading?.t) throw new Error("reading.t (Date) is required");

    const bucketMs = Number(options.bucketMs || BUCKET_MS);
    const keepRaw = options.keepRaw !== false; // mặc định lưu readings[]

    const bucketStart = floorToBucket(reading.t, bucketMs);
    const bucketEnd = new Date(bucketStart.getTime() + bucketMs);
    const expiresAt = makeExpiresAt(bucketStart);

    const { $min, $max, $inc, $set } = buildUpdateOperators(reading);
    const $push = keepRaw ? { readings: reading } : undefined;

    const $setOnInsert = {
        deviceId,
        bucketStart,
        bucketEnd,
        bucketWidthMs: bucketMs,
        expiresAt
    };

    const update = { $setOnInsert, $min, $max, $inc, $set };
    if ($push) update.$push = $push;

    // Lưu ý: Nếu chỉ số nào không có trong reading, không thay đổi min/max/sum/counts của nó.
    return this.updateOne({ deviceId, bucketStart }, update, { upsert: true });
};

/**
 * Lấy mẫu gần nhất (last) cho 1 thiết bị
 */
ReadingBucketSchema.statics.getLatest = async function getLatest(deviceId) {
    const doc = await this.findOne({ deviceId })
        .sort({ bucketStart: -1 })
        .select({ last: 1, bucketStart: 1, bucketEnd: 1 })
        .lean();

    return doc?.last || null;
};

/**
 * Truy vấn dải thời gian [from, to) trả về các mẫu thô theo thời gian tăng dần.
 * Nếu bạn tắt keepRaw (không lưu mảng readings), dùng aggregate ở mức bucket hoặc timeseries khác.
 */
ReadingBucketSchema.statics.queryRange = async function queryRange(deviceId, from, to) {
    const $match = {
        deviceId,
        bucketStart: { $lt: to },
        bucketEnd: { $gt: from }
    };

    return this.aggregate([
        { $match },
        { $unwind: "$readings" },
        { $match: { "readings.t": { $gte: from, $lt: to } } },
        { $sort: { "readings.t": 1 } },
        {
            $project: {
                _id: 0,
                t: "$readings.t",
                air_temperature: "$readings.air_temperature",
                air_humidity: "$readings.air_humidity",
                light_raw: "$readings.light_raw",
                rainRaw: "$readings.rainRaw",
                soil_temperature: "$readings.soil_temperature",
                soil_humidity: "$readings.soil_humidity",
                nitrogen: "$readings.nitrogen",
                phosphorus: "$readings.phosphorus",
                potassium: "$readings.potassium",
                ph: "$readings.ph"
            }
        }
    ]);
};

/**
 * Tính trung bình theo bucket đã gộp sẵn (không cần đọc readings thô).
 * Lưu ý: average = sum[metric] / counts[metric] (không dùng count tổng)
 */
ReadingBucketSchema.statics.avgByBuckets = async function avgByBuckets(deviceId, from, to) {
    return this.aggregate([
        {
            $match: {
                deviceId,
                bucketStart: { $gte: from, $lt: to }
            }
        },
        {
            $project: {
                _id: 0,
                bucketStart: 1,
                bucketEnd: 1,
                avg: METRICS.reduce((acc, m) => {
                    acc[m] = {
                        $cond: [{ $gt: [`$counts.${m}`, 0] }, { $divide: [`$sum.${m}`, `$counts.${m}`] }, null]
                    };
                    return acc;
                }, {})
            }
        },
        { $sort: { bucketStart: 1 } }
    ]);
};

const ReadingBucket = mongoose.model("ReadingBucket", ReadingBucketSchema);
module.exports = { ReadingBucket, METRICS, BUCKET_MS };
