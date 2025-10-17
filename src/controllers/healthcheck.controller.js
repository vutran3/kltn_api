const FormData = require("form-data");
const axios = require("axios");
const { BadRequestError } = require("../core/error.response");
const { SuccessResponse } = require("../core/success.response");
const { uploadBufferToCloudinary } = require("../config/cloudinary.config");
const HealthCheckService = require("../services/healthcheck.service");
const { createAndEmit } = require("../services/notification.service");
const { getDeviceByDeviceId } = require("../services/device.service");
const { getFieldByDeviceId } = require("../services/field.service");

class HealthCheckController {
    collectImageWeekly = async (req, res, next) => {
        const deviceId = req.headers["x-device-id"];

        if (!deviceId) throw new BadRequestError("deviceId is required");
        if (!req.body) throw new BadRequestError("image file is required");

        const tsMs = Date.now();

        if (!Number.isFinite(tsMs)) throw new BadRequestError("Invalid timestamp (ts/capturedAt/timestamp)");

        const anchorAt = new Date(tsMs);

        // Tạo khóa ngày theo VN (UTC+7) để gom thư mục cho dễ quản lý
        const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
        const local = new Date(tsMs + VN_OFFSET_MS);
        const yyyy = local.getUTCFullYear();
        const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(local.getUTCDate()).padStart(2, "0");
        const dateKeyVN = `${yyyy}-${mm}-${dd}`;

        const format = "jpeg";

        // Giữ nguyên prefix "weekly" để khỏi ảnh hưởng các consumer khác,
        // nhưng thư mục con dùng theo ngày thực tế thay vì tuần chuẩn hóa
        const folder = `weekly/${deviceId}/${dateKeyVN}`;
        const publicId = `${deviceId}_${tsMs}`;

        const up = await uploadBufferToCloudinary(req.body, {
            folder,
            public_id: publicId,
            format
        });

        // --- [3] Gọi AI predict ---
        const predictURL = process.env.PREDICT_URL || "http://127.0.0.1:8080/predict";
        const confThreshold = 0.5;

        const form = new FormData();
        form.append("file", req.body, {
            filename: `${publicId}.${format}`,
            contentType: req.file.mimetype
        });

        const { data: predict } = await axios.post(predictURL, form, {
            params: { conf_threshold: confThreshold },
            headers: form.getHeaders(),
            timeout: 60_000
        });

        // --- [4] Lưu DB: weekStartAt ---
        const payload = {
            deviceId,
            weekStartAt: anchorAt,
            image_predetect: {
                image_url: up.secure_url,
                public_id: up.public_id
            },
            ai_description: predict.prediction_text,
            ai_prediction: { ...predict }
        };

        const predicted = await HealthCheckService.insertPredictHealth(payload);
        if (!predicted) throw new BadRequestError("Has an error when health check !!!");

        // --- [5] Gửi thông báo ---
        const device = await getDeviceByDeviceId(deviceId);
        if (!device) throw new BadRequestError("Invalid request !!!");

        const field = await getFieldByDeviceId(device._id);
        if (!field) throw new BadRequestError("Invalid request !!!");

        const userId = req.get("x-user-id") || (req.headers && req.headers["x-user-id"]) || "user001";

        const noAbnormalDetected =
            (predict &&
                predict.is_diseased === false &&
                (predict.num_detections === 0 || (Array.isArray(predict.boxes) && predict.boxes.length === 0))) ||
            Number(predicted.ai_prediction?.max_confidence) < 0.5;

        if (noAbnormalDetected) {
            await createAndEmit({
                userId,
                deviceId,
                title: "Cập nhật sức khỏe cây trồng",
                body: `Thiết bị ${deviceId} không phát hiện bất thường tại khu vực ${field.name}`,
                data: {
                    healthCheckId: predicted._id,
                    deviceId,
                    ai: predict.prediction_text
                }
            });
        } else if (
            predicted &&
            predicted.ai_prediction?.is_diseased === true &&
            Number(predicted.ai_prediction?.max_confidence) >= 0.5
        ) {
            await createAndEmit({
                userId,
                deviceId,
                title: "Cảnh báo sức khỏe cây trồng",
                body: `Thiết bị ${deviceId} phát hiện bất thường tại khu vực ${field.name}`,
                data: {
                    healthCheckId: predicted._id,
                    deviceId,
                    ai: predict.prediction_text
                }
            });
        }

        new SuccessResponse({
            message: "Predict health",
            metadata: predicted
        }).send(res);
    };

    findAllResult = async (req, res, next) => {
        new SuccessResponse({
            message: "Find all check result",
            metadata: await HealthCheckService.findAllResults(req.query)
        }).send(res);
    };

    findRecordById = async (req, res, next) => {
        new SuccessResponse({
            message: "Find record by id",
            metadata: await HealthCheckService.findRecordById(req.params.hcid)
        }).send(res);
    };
}

module.exports = new HealthCheckController();
