const { z } = require("zod");
const { runGeminiChat } = require("../ai/gemini.client");
const { buildPrompt } = require("../ai/context");

const Schema = z.object({
    deviceId: z.string(),
    cropType: z.string().optional(),
    contextNotes: z.array(z.string()).optional(),
    timeRange: z.string().optional(),
    latest: z
        .object({
            at: z.string().optional(),
            ph: z.number().nullable().optional(),
            soilHumidity: z.number().nullable().optional(),
            soilTemperature: z.number().nullable().optional(),
            airTemperature: z.number().nullable().optional(),
            airHumidity: z.number().nullable().optional(),
            lightRaw: z.number().nullable().optional(),
            nitrogen: z.number().nullable().optional(),
            phosphorus: z.number().nullable().optional(),
            potassium: z.number().nullable().optional()
        })
        .nullable()
        .optional(),
    average: z.record(z.string(), z.number().nullable()).nullable().optional(),
    bands: z.any().optional(),
    npkTargets: z.any().optional()
});

module.exports = {
    advise: async (req, res) => {
        try {
            const parsed = Schema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
            }
            const payload = parsed.data;
            const { system, user } = buildPrompt(payload);

            const advice = await runGeminiChat({
                userData: user,
                systemData: system
            });
            return res.json({ data: { advice } });
        } catch (e) {
            console.error("AI advise error:", e);
            return res.status(500).json({ message: "Advisor error", error: e?.message });
        }
    }
};
