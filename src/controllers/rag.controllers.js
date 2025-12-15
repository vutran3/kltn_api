const { getSystem, getUser } = require("../ai/context");
const RagServices = require("../services/rag.services");
const fetch = require("node-fetch");
const Rag = require("../models/rag.model");
const { runGeminiChat } = require("../ai/gemini.client");
const createHttpError = require("http-errors");
const { sendExpertReviewEmail } = require("../utils/email");

class RagControllers {
    async uploadSingleImage(req, res, next) {
        try {
            const bufferImage = req.file.buffer;
            const content = req.body?.content;

            const vectorImage = await fetch(process.env.VECTOR_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: bufferImage
            })
                .then((response) => response.json())
                .then((data) => data.vector)
                .catch((error) => {
                    console.error("Error:", error);
                });

            await RagServices.uploadImageToMongoDBCloud({
                vectorImages: [vectorImage],
                bufferImages: [bufferImage],
                content
            });

            res.status(201).send({
                code: 201,
                message: "Image uploaded successfully"
            });
        } catch (error) {
            next(error);
        }
    }

    // controllers/rag.controller.js (hoặc nơi bạn đang đặt handler)
    async sendQuestion(req, res, next) {
        try {
            const image = req.file?.buffer || null;
            const device_id = req.body.device_id;

            const relatedData = await RagServices.getRelatedData({ image }).catch(() => []);
            const context = Array.isArray(relatedData) && relatedData.length > 0 ? relatedData[0]?.content || "" : "—";

            const advice = await runGeminiChat({
                userData: getUser(context),
                systemData: getSystem(),
                imageBuffers: [image],
                fallbackText: `
                | Tên bệnh | Triệu chứng điển hình | Nguyên nhân gây bệnh | Điều kiện phát sinh | Biện pháp phòng trị | Ghi chú bổ sung |
                |---|---|---|---|---|---|
                | Chưa đủ dữ liệu | Chưa đủ dữ liệu | — | — | — | Vui lòng cung cấp ảnh lá gần, ảnh mặt dưới lá, thông tin thời tiết gần đây và độ ẩm đất. |
                `
            });

            await Rag.create({
                device_id: device_id,
                detect_date: new Date(),
                description: advice ?? "",
                image: image ?? null,
                relative_image: relatedData?.[0]?.imageData ?? null
            });

            return res.status(200).json({
                data: {
                    advice,
                    image: relatedData?.[0]?.imageData ?? null
                }
            });
        } catch (error) {
            next(error);
        }
    }
    async getDeviceHistory(req, res, next) {
        try {
            const { device_id } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 6;

            if (!device_id) {
                return res.status(400).json({ message: "Device ID is required" });
            }

            const skip = (page - 1) * limit;

            const [total, history] = await Promise.all([
                Rag.countDocuments({ device_id }),
                Rag.find({ device_id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
            ]);

            const totalPages = Math.ceil(total / limit);

            return res.status(200).json({
                data: history,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteHistoryItem(req, res, next) {
        try {
            const { id } = req.params;
            await Rag.findByIdAndDelete(id);
            return res.status(200).json({ message: "Xóa lịch sử thành công" });
        } catch (error) {
            next(error);
        }
    }

    async clearDeviceHistory(req, res, next) {
        try {
            const { device_id } = req.body;
            if (!device_id) throw createHttpError.BadRequest("Thiếu trường device_id");

            await Rag.deleteMany({ device_id });
            return res.status(200).json({ message: "Xóa toàn bộ lịch sử thành công" });
        } catch (error) {
            next(error);
        }
    }

    async requestExpertHelp(req, res, next) {
        try {
            const { id } = req.body;
            if (!id) throw createHttpError.BadRequest("Thiếu Rag ID");

            const ragRecord = await Rag.findById(id);
            if (!ragRecord) throw createHttpError.NotFound("Không tìm thấy bản ghi");

            if (ragRecord.isSend) {
                return res.status(400).json({
                    message: "Yêu cầu này đã được gửi tới chuyên gia trước đó. Vui lòng đợi phản hồi."
                });
            }

            if (ragRecord.expert_feedback && ragRecord.expert_feedback.trim() !== "")
                throw createHttpError.BadRequest("Đã có phản hồi từ chuyên gia, không cần gửi lại.");

            const sent = await sendExpertReviewEmail({
                deviceId: ragRecord.device_id,
                detect_date: ragRecord.detect_date,
                advice: ragRecord.description,
                imageBuffer: ragRecord.image,
                ragId: ragRecord._id
            });

            if (!sent) throw createHttpError.InternalServerError("Gửi mail thất bại, vui lòng thử lại sau.");

            ragRecord.isSend = true;
            await ragRecord.save();

            return res.status(200).json({ message: "Đã gửi yêu cầu đến chuyên gia thành công!" });
        } catch (error) {
            next(error);
        }
    }

    async getRagDetail(req, res, next) {
        try {
            const { id } = req.params;
            const rag = await Rag.findById(id);
            if (!rag) throw createHttpError.NotFound("Không tìm thấy dữ liệu.");

            return res.status(200).json({ data: rag });
        } catch (error) {
            next(error);
        }
    }

    async submitExpertFeedback(req, res, next) {
        try {
            const { id } = req.params;
            const { feedback } = req.body;

            if (!feedback || feedback.trim() === "") {
                throw createHttpError.BadRequest("Nội dung đánh giá không được để trống.");
            }

            const updatedRag = await Rag.findByIdAndUpdate(id, { expert_feedback: feedback }, { new: true });

            if (!updatedRag) throw createHttpError.NotFound("Không tìm thấy bản ghi.");

            return res.status(200).json({
                message: "Đã lưu đánh giá thành công!",
                data: updatedRag
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new RagControllers();
