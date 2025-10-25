const { getSystem, getUser } = require("../ai/context");
const RagServices = require("../services/rag.services");
const openai = require("../ai/openai.client");
const fetch = require("node-fetch");

class RagControllers {
    async uploadSingleImage(req, res, next) {
        try {
            console.log(req.file);
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
            const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
            const image = req.file?.buffer || null;

            const relatedData = await RagServices.getRelatedData({ image }).catch(() => []);
            const context = Array.isArray(relatedData) && relatedData.length > 0 ? relatedData[0]?.content || "" : "—";

            const completion = await openai.chat.completions.create({
                model,
                temperature: 0.2,
                presence_penalty: 0,
                frequency_penalty: 0,
                messages: [
                    { role: "system", content: getSystem() },
                    { role: "user", content: getUser(context) }
                ]
            });

            const advice =
                completion?.choices?.[0]?.message?.content?.trim() ||
                `| Tên bệnh | Triệu chứng điển hình | Nguyên nhân gây bệnh | Điều kiện phát sinh | Biện pháp phòng trị (Sinh học / Hóa học / Canh tác) | Ghi chú bổ sung |
                 |---|---|---|---|---|---|
                 | Chưa đủ dữ liệu | Chưa đủ dữ liệu | — | — | — | Vui lòng cung cấp ảnh lá gần, ảnh mặt dưới lá, thông tin thời tiết gần đây và độ ẩm đất. |
                `;

            return res.status(200).json({
                data: {
                    advice,
                    image: relatedData?.[0]?.imageData ?? null
                }
            });
        } catch (error) {
            console.log(error);
            next(error);
        }
    }
}

module.exports = new RagControllers();
