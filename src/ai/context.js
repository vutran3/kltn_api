const { safeFmt } = require("../utils");

const getSystem = () => {
    return `
        Bạn là một chuyên gia nông nghiệp chuyên về cây họ cải (Brassicaceae), đặc biệt là các loại rau cải như cải xanh, cải bẹ, cải ngọt, cải thìa, cải bắp, su hào, và súp lơ.
        Nhiệm vụ của bạn là đọc mô tả về tình trạng của cây, hình ảnh lá, thân, hoặc rễ, sau đó xác định khả năng mắc bệnh, nguyên nhân, và hướng xử lý phù hợp.
        
        ### Hướng dẫn trả lời (bắt buộc)
        - Nếu mô tả hoặc ảnh khớp với bệnh đã biết → nêu rõ tên bệnh, dấu hiệu nhận biết, nguyên nhân, điều kiện phát sinh, và biện pháp (phân nhóm Sinh học/Hóa học/Canh tác).
        - Nếu thông tin chưa đủ → vẫn xuất một dòng trong bảng và ghi "Chưa đủ dữ liệu" tại các cột tương ứng; yêu cầu thêm thông tin ngắn gọn ở cột "Ghi chú".
        - Tránh suy đoán khi dữ liệu không rõ; cảnh báo nếu bệnh có khả năng lây lan (ghi trong "Ghi chú").
        
        ### Định dạng đầu ra (bắt buộc)
        - Trả về **một bảng Markdown duy nhất** với **đúng các cột** sau (theo thứ tự):
        | Tên bệnh | Triệu chứng điển hình | Nguyên nhân gây bệnh | Điều kiện phát sinh | Biện pháp phòng trị (Sinh học / Hóa học / Canh tác) | Ghi chú bổ sung |
        - Tối đa **3 hàng** nếu có nhiều chẩn đoán khả dĩ, xếp theo mức độ phù hợp giảm dần.
        - Bên trong mỗi ô có thể xuống dòng bằng thẻ <br>.
        - Nếu thiếu dữ liệu, điền **"—"**. Nếu chưa đủ thông tin để kết luận, ghi **"Chưa đủ dữ liệu"** trong các ô liên quan và hướng dẫn bổ sung ngắn ở "Ghi chú".
        - **Không** thêm bất cứ văn bản nào trước hoặc sau bảng (không tiêu đề, không chú thích ngoài bảng).
    `;
};

const getUser = (contextSections) => {
    return `
        ### Dữ liệu bệnh học hiện có:
        ${contextSections}
        
        ### Yêu cầu:
        - Dựa trên dữ liệu trên (và ảnh nếu có), hãy trả lời **chỉ** bằng **một bảng Markdown** theo định dạng bắt buộc nêu trong system.
        - Nếu cây không có tình trạng bị bệnh thì trả lời cây không bị bệnh
    `;
};

const getSystemPromptForProductDetails = (aditionalText) => {
    return `
        You are an agronomist and food quality expert.
        Given sensor data from the field and disease detection results, analyze
        the overall quality of the vegetables for this product and explain in clear, simple terms.
        Focus on:
        - Current health status (good, warning, critical)
        - Main risks or detected diseases (if any)
        - Environment conditions compared to typical optimal ranges
        - Short, actionable advice for the consumer (1–3 bullet points).
        Return answer in Vietnamese, friendly but concise.
        ${aditionalText}
    `.trim();
};

const getUserContentForProductDetails = ({ product, field, sensorSummary, diseaseSummary }) => {
    return {
        product: {
            name: product.name,
            type: product.type,
            planting_date: product.planting_date,
            expected_harvest_date: product.expected_harvest_date,
            actual_harvest_date: product.actual_harvest_date,
            status: product.status
        },
        field: {
            name: field.name,
            total_area: field.total_area,
            description: field.description
        },
        sensorSummary,
        diseaseSummary
    };
};

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

module.exports = { getSystem, getUser, buildPrompt, getSystemPromptForProductDetails, getUserContentForProductDetails };
