const { getSystem, getUser } = require("../ai/context");
const RagServices = require("../services/rag.services");
const fetch = require("node-fetch");
const Rag = require("../models/rag.model");
const { runGeminiChat } = require("../ai/gemini.client");

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
            console.log({
                user: getUser(context),
                system: getSystem()
            });
            const advice = await runGeminiChat({
                userData: getUser(context),
                systemData: getSystem(),
                imageBuffers: [image],
                fallbackText: `
                | Tên bệnh | Triệu chứng điển hình | Nguyên nhân gây bệnh | Điều kiện phát sinh | Biện pháp phòng trị (Sinh học / Hóa học / Canh tác) | Ghi chú bổ sung |
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
}

module.exports = new RagControllers();
