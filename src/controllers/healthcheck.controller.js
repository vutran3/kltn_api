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

        // 1) Lấy ảnh từ express.raw: Buffer
        const imgBuffer = req.body;
        if (!imgBuffer || !Buffer.isBuffer(imgBuffer) || imgBuffer.length === 0) {
            throw new BadRequestError("image file is required (empty body)");
        }

        const contentType = (req.headers["content-type"] || "image/jpeg").toLowerCase();
        let format = (contentType.split("/")[1] || "jpeg").toLowerCase();
        if (format === "jpg") format = "jpeg";

        // 3) Sinh tên/thư mục, timestamp VN...
        const tsMs = Date.now();
        const anchorAt = new Date(tsMs);
        const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
        const local = new Date(tsMs + VN_OFFSET_MS);
        const yyyy = local.getUTCFullYear();
        const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(local.getUTCDate()).padStart(2, "0");
        const dateKeyVN = `${yyyy}-${mm}-${dd}`;

        const folder = `weekly/${deviceId}/${dateKeyVN}`;
        const publicId = `${deviceId}_${tsMs}`;

        const up = await uploadBufferToCloudinary(imgBuffer, {
            folder,
            public_id: publicId,
            format,
        });

        // 5) GỌI PREDICT
        const confThreshold = 0.5;
        const PREDICT_MODE = (process.env.PREDICT_MODE || "").toLowerCase();
        const LOCAL_PREDICT_URL = process.env.PREDICT_URL || "http://127.0.0.1:8080/predict";
        const imageUrl = up.secure_url;

        async function callLocalPredict() {
            const FormData = require("form-data");
            const form = new FormData();
            form.append("file", imgBuffer, {
                filename: `${publicId}.${format}`,
                contentType,
            });
            const { data } = await axios.post(LOCAL_PREDICT_URL, form, {
                params: { conf_threshold: confThreshold },
                headers: form.getHeaders(),
                timeout: 60_000,
            });
            return data;
        }

    
        async function callHuggingFacePredict() {
            const HF_PREDICT_URL = process.env.HF_PREDICT_URL;
            const HF_API_TOKEN = process.env.HF_API_TOKEN;
            
            if (!HF_PREDICT_URL || !HF_API_TOKEN) {
                throw new Error("HF_PREDICT_URL / HF_API_TOKEN is missing");
            }
            const body = { inputs: { image_url: imageUrl},  conf: confThreshold };
            
            const { data } = await axios.post(HF_PREDICT_URL, body, {
                headers: {
                    Authorization: `Bearer ${HF_API_TOKEN}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                timeout: 60_000,
            });
           
            return data;
        }

        let predict;
        try {
            if (PREDICT_MODE === "hf") {
                predict = await callHuggingFacePredict();
            } else if (PREDICT_MODE === "local") {
                predict = await callLocalPredict();
            } else {
                try {
                    predict = await callHuggingFacePredict();
                } catch (e) {
                    console.warn("[predict][hf] failed, fallback local:", e?.response?.status, e?.response?.data || e?.message);
                    predict = await callLocalPredict();
                }
            }
        } catch (err) {
            const status = err?.response?.status;
            const detail = err?.response?.data || err?.message;
            throw new BadRequestError(`Predict failed: ${status || ""} ${JSON.stringify(detail)}`);
        }

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

        // --- [5] Bắn notification nếu bất thường ---
        const device = await getDeviceByDeviceId(deviceId);
        const field = device ? await getFieldByDeviceId(device._id) : null;

        if (predict?.is_diseased && field) {
            const userId = field?.ownerUserId || device?.userId;
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
