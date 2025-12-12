const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function runGPTChat({ userData, systemData, modelName, fallbackText }) {
    try {
        const completion = await client.chat.completions.create({
            model: modelName || "gpt-4o-mini",
            temperature: 0.2,
            presence_penalty: 0,
            frequency_penalty: 0,
            messages: [
                { role: "system", content: systemData },
                { role: "user", content: userData }
            ]
        });

        return completion?.choices?.[0]?.message?.content?.trim() || fallbackText;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    runGPTChat
};
