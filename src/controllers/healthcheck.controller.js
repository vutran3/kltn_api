
const FormData = require('form-data')
const axios = require('axios')
const { BadRequestError } = require('../core/error.response')
const { SuccessResponse } = require('../core/success.response')
const { uploadBufferToCloudinary } = require('../config/cloudinary.config')
const HealthCheckService = require('../services/healthcheck.service')
const { findAllCheckResults } = require('../models/repositories/healthcheck.repo')
class HealthCheckController {

    static mondayKeyVN(tsMs, hourLocal = 8) {
        const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
        const localMs = tsMs + VN_OFFSET_MS;
        const dLocal = new Date(localMs);

        // getUTCDay(): 0=CN..6=T7 -> quy ước 0=Thứ 2
        const dow = (dLocal.getUTCDay() + 6) % 7;

        const y = dLocal.getUTCFullYear();
        const m = dLocal.getUTCMonth();
        const dd = dLocal.getUTCDate() - dow;

        // Tạo mốc 08:00 giờ VN rồi chuyển ngược về UTC (trừ offset)
        const weekStartUtcMs = Date.UTC(y, m, dd, hourLocal, 0, 0, 0) - VN_OFFSET_MS;
        const weekStartAt = new Date(weekStartUtcMs);
        const weekKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        return { weekKey, weekStartAt }
    }
    collectImageWeekly = async (req, res, next) => {
        const b = req.body || {};
        if (!b.deviceId) throw new BadRequestError('deviceId is required')
        if (!req.file) throw new BadRequestError('image file is required')
        const deviceId = String(b.deviceId);
        const nowMs = Date.now();
        const tsMs = typeof b.ts === 'number' ? b.ts : nowMs;
        const isPng = req.file.mimetype === 'image/png';
        const format = isPng ? 'png' : 'jpg';
        const { weekKey, weekStartAt } = HealthCheckController.mondayKeyVN(tsMs, 8);
        const folder = `weekly/${deviceId}/${weekKey}`
        const publicId = `${deviceId}_${tsMs}`
        const up = await uploadBufferToCloudinary(req.file.buffer, {
            folder,
            public_id: publicId,
            format,
        });
        const predictURL = process.env.PREDICT_URL || 'http://127.0.0.1:8080/predict';
        const confThreshold = (b.conf_threshold && Number(b.conf_threshold)) || 0.25;
        const form = new FormData()
        form.append('file', req.file.buffer, {
            filename: `${publicId}.${format}`,
            contentType: req.file.mimetype,
        });
        const { data: predict } = await axios.post(predictURL, form, {
            params: { conf_threshold: confThreshold },
            headers: form.getHeaders(),
            timeout: 60_000,
        });
        console.log("predict:::", predict)

        const payload = {
            deviceId,
            weekStartAt,
            image_predetect: {
                image_url: up.secure_url,
                public_id: up.public_id
            },
            ai_description: predict.prediction_text,
            ai_prediction: { ...predict }
        }

        new SuccessResponse({
            message: "Predict health",
            metadata: await HealthCheckService.insertPredictHealth(payload)
        }).send(res)
    }

    findAllResult = async (req, res, next) => {
        new SuccessResponse({
            message: "Find all check reuslt",
            metadata: await findAllCheckResults(req.params)
        }).send(res)
    }
}

module.exports = new HealthCheckController()