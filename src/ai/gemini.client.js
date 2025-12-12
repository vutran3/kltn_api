// gemini.service.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runGeminiChat({ systemData, userData, imageBuffers = [], fallbackText, generationConfig = {} }) {
    try {
        const config = {
            model: "gemini-2.5-flash",
            systemInstruction: systemData
        };

        if (Object.keys(generationConfig).length > 0) config.generationConfig = generationConfig;

        const model = genAI.getGenerativeModel(config);

        const parts = [{ text: userData }];

        if (imageBuffers.length > 0) {
            if (Array.isArray(imageBuffers) && imageBuffers.length > 0) {
                imageBuffers.forEach((buffer) => {
                    parts.push({
                        inlineData: {
                            data: buffer.toString("base64"),
                            mimeType: "image/png"
                        }
                    });
                });
            }
        }

        const result = await model.generateContent({
            contents: [{ role: "user", parts: parts }]
        });

        return result.response.text().trim() ?? fallbackText;
    } catch (error) {
        console.error("Gemini Error:", error);
        return fallbackText;
    }
}

async function runGeminiChatStream({ systemData, userData, imageBuffers = [], generationConfig = {} }) {
    try {
        const config = {
            model: "gemini-2.5-flash",
            systemInstruction: systemData
        };

        if (Object.keys(generationConfig).length > 0) config.generationConfig = generationConfig;

        const model = genAI.getGenerativeModel(config);

        const parts = [{ text: userData }];

        // Xử lý ảnh (giống logic cũ của bạn)
        if (Array.isArray(imageBuffers) && imageBuffers.length > 0) {
            imageBuffers.forEach((buffer) => {
                parts.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType: "image/png"
                    }
                });
            });
        }

        // QUAN TRỌNG: Dùng generateContentStream thay vì generateContent
        const result = await model.generateContentStream({
            contents: [{ role: "user", parts: parts }]
        });

        // Trả về đối tượng stream để Controller xử lý
        return result.stream;
    } catch (error) {
        console.error("Gemini Stream Error:", error);
        throw error;
    }
}

module.exports = { runGeminiChat, runGeminiChatStream };
