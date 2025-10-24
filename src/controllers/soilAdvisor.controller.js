const { z } = require("zod");
const openai = require("../ai/openai.client");

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

function safeFmt(v, unit = "") {
    if (v === null || v === undefined) return "—";
    return `${Number(v).toFixed(v % 1 ? 2 : 0)}${unit}`;
}

function buildPrompt(payload) {
    const { deviceId, cropType, contextNotes, timeRange, latest, average, bands, npkTargets } = payload;

    const facts = [];
    facts.push(`Thiết bị: ${deviceId}`);
    if (cropType) facts.push(`Giống rau họ cải: ${cropType}`);
    if (contextNotes?.length) facts.push(`Bối cảnh: ${contextNotes.join("; ")}`);
    facts.push(`Khoảng thời gian: ${timeRange || "N/A"}`);
    facts.push(`— Số liệu GẦN NHẤT:`);
    if (latest) {
        facts.push(`  • Thời điểm: ${latest.at || "N/A"}`);
        facts.push(`  • pH: ${safeFmt(latest.ph)}`);
        facts.push(
            `  • Ẩm đất: ${safeFmt(latest.soilHumidity, "%")} | Nhiệt độ đất: ${safeFmt(latest.soilTemperature, "°C")}`
        );
        facts.push(
            `  • Nhiệt độ KK: ${safeFmt(latest.airTemperature, "°C")} | Ẩm KK: ${safeFmt(latest.airHumidity, "%")}`
        );
        facts.push(`  • Ánh sáng: ${safeFmt(latest.lightRaw, " lux")}`);
        facts.push(
            `  • N: ${safeFmt(latest.nitrogen, " ppm")} | P: ${safeFmt(latest.phosphorus, " ppm")} | K: ${safeFmt(
                latest.potassium,
                " ppm"
            )}`
        );
    }
    facts.push(`— TRUNG BÌNH:`);
    if (average) {
        facts.push(`  • pH: ${safeFmt(average.ph)}`);
        facts.push(
            `  • Ẩm đất: ${safeFmt(average.soilHumidity, "%")} | Nhiệt độ đất: ${safeFmt(
                average.soilTemperature,
                "°C"
            )}`
        );
        facts.push(
            `  • Nhiệt độ KK: ${safeFmt(average.airTemperature, "°C")} | Ẩm KK: ${safeFmt(average.airHumidity, "%")}`
        );
        facts.push(`  • Ánh sáng: ${safeFmt(average.lightRaw, " lux")}`);
        facts.push(
            `  • N: ${safeFmt(average.nitrogen, " ppm")} | P: ${safeFmt(average.phosphorus, " ppm")} | K: ${safeFmt(
                average.potassium,
                " ppm"
            )}`
        );
    }

    const bandText = bands
        ? `
            Ngưỡng tham chiếu theo giống:
            - pH: ${bands?.ph?.min ?? "?"}–${bands?.ph?.max ?? "?"}
            - Ẩm đất: ${bands?.soilMoist?.min ?? "?"}%–${bands?.soilMoist?.max ?? "?"}%
            - Nhiệt độ đất: ${bands?.soilTemp?.min ?? "?"}–${bands?.soilTemp?.max ?? "?"}°C
            - Nhiệt độ KK: ${bands?.airTemp?.min ?? "?"}–${bands?.airTemp?.max ?? "?"}°C
            - Ẩm KK: ${bands?.airHumid?.min ?? "?"}%–${bands?.airHumid?.max ?? "?"}%
            - Ánh sáng: ${bands?.light?.min ?? "?"}–${bands?.light?.max ?? "?"} lux
        `
        : "";

    const npkText = npkTargets
        ? `
            Ngưỡng NPK tương đối (ppm):
            - N: ${npkTargets?.n?.low ?? "?"}–${npkTargets?.n?.high ?? "?"}
            - P: ${npkTargets?.p?.low ?? "?"}–${npkTargets?.p?.high ?? "?"}
            - K: ${npkTargets?.k?.low ?? "?"}–${npkTargets?.k?.high ?? "?"}
        `
        : "";

    const system = `
        Bạn là chuyên gia nông nghiệp rau họ cải tại Việt Nam.
        TRẢ LỜI BẰNG HTML HỢP LỆ (không bọc <html>/<body>), dùng class và cấu trúc sau (UI đã gắn CSS sẵn):

        - Chia phần bằng <div class="section"> và <h3>.
        - Bảng tổng hợp đầu trang với cột: "Chỉ số", "Giá trị gần nhất", "Giá trị trung bình", "Ngưỡng khuyến nghị", "Trạng thái".
        - Sau bảng, gồm các mục:
        <h3>Khuyến nghị điều chỉnh</h3> (bullet list, thứ tự ưu tiên, định lượng nếu có).
        <h3>Giống họ cải đề xuất</h3> (bảng 2–4 giống, cột: Giống | Điều kiện phù hợp | Ghi chú).
        <h3>Kế hoạch 7–14 ngày</h3> (liệt kê theo nhóm ngày).
        <h3>Lưu ý an toàn</h3> (bullet list).
        - Tập trung vào bối cảnh Việt Nam (miền Bắc/Trung/Nam; mùa mưa/khô; đất phù sa, cát ven biển, bazan, sét nặng; nguy cơ mặn/phèn).
        - Không dùng Markdown; không chèn code.
        - Ngắn gọn, súc tích, dễ hành động; nhấn mạnh đây là tư vấn tham khảo vì cảm biến/đất có sai số.
    `;

    const user = `${facts.join("\n")}\n${bandText}${npkText}`;

    return { system, user };
}

module.exports = {
    advise: async (req, res) => {
        try {
            const parsed = Schema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({ message: "Invalid payload", issues: parsed.error.issues });
            }
            const payload = parsed.data;
            const { system, user } = buildPrompt(payload);
            const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

            const completion = await openai.chat.completions.create({
                model,
                temperature: 0.4,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ]
            });

            const advice = completion?.choices?.[0]?.message?.content?.trim() || "Không có nội dung.";
            return res.json({ data: { advice } });
        } catch (e) {
            console.error("AI advise error:", e);
            return res.status(500).json({ message: "Advisor error", error: e?.message });
        }
    }
};
