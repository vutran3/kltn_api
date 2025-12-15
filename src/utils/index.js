const { Types } = require("mongoose");

const SENSOR_CONFIG = {
    temperature: { min: 25, max: 35, decimals: 1 },
    humidity: { min: 60, max: 90, decimals: 1 },
    soil_humidity: { min: 40, max: 80, decimals: 1 },
    light: { min: 1000, max: 50000, decimals: 0 },
    ph: { min: 5.5, max: 7.5, decimals: 2 },
    nutrient: { min: 200, max: 350, decimals: 0 } // N-P-K
};

const randomInRange = (min, max, decimals = 0) => {
    const val = Math.random() * (max - min) + min;
    return Number(val.toFixed(decimals));
};

const getSmartRandomValue = (field) => {
    switch (field) {
        case "air_temperature":
        case "soil_temperature":
            return randomInRange(
                SENSOR_CONFIG.temperature.min,
                SENSOR_CONFIG.temperature.max,
                SENSOR_CONFIG.temperature.decimals
            );

        case "air_humidity":
            return randomInRange(
                SENSOR_CONFIG.humidity.min,
                SENSOR_CONFIG.humidity.max,
                SENSOR_CONFIG.humidity.decimals
            );

        case "soil_humidity":
            return randomInRange(
                SENSOR_CONFIG.soil_humidity.min,
                SENSOR_CONFIG.soil_humidity.max,
                SENSOR_CONFIG.soil_humidity.decimals
            );

        case "light_raw":
            return randomInRange(SENSOR_CONFIG.light.min, SENSOR_CONFIG.light.max, SENSOR_CONFIG.light.decimals);

        case "ph":
            return randomInRange(SENSOR_CONFIG.ph.min, SENSOR_CONFIG.ph.max, SENSOR_CONFIG.ph.decimals);

        case "nitrogen":
        case "phosphorus":
        case "potassium":
            return randomInRange(
                SENSOR_CONFIG.nutrient.min,
                SENSOR_CONFIG.nutrient.max,
                SENSOR_CONFIG.nutrient.decimals
            );

        default:
            return 0;
    }
};

const toNumberOrUndefined = (v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

const getValueOrRandom = (val, fieldName) => {
    const realValue = toNumberOrUndefined(val);
    if (realValue !== undefined) return realValue;
    return getSmartRandomValue(fieldName);
};

const buildReadingFromBody = (b, ts) => {
    const rawSoilHum = typeof b.soilHumidity !== "undefined" ? b.soilHumidity : b.wetPct;

    return {
        t: ts,
        air_temperature: getValueOrRandom(b.airTemperature, "air_temperature"),
        air_humidity: getValueOrRandom(b.airHumidity, "air_humidity"),
        light_raw: getValueOrRandom(b.lightRaw, "light_raw"),
        soil_temperature: getValueOrRandom(b.soilTemperature, "soil_temperature"),
        soil_humidity: getValueOrRandom(rawSoilHum, "soil_humidity"),
        nitrogen: getValueOrRandom(b.nitrogen, "nitrogen"),
        phosphorus: getValueOrRandom(b.phosphorus, "phosphorus"),
        potassium: getValueOrRandom(b.potassium, "potassium"),
        ph: getValueOrRandom(b.ph, "ph")
    };
};

const parseDateMaybe = (x) => {
    if (x == null) return undefined;
    if (typeof x === "number") {
        const d = new Date(x);
        return isNaN(d) ? undefined : d;
    }
    if (typeof x === "string") {
        const n = Number(x);
        if (Number.isFinite(n)) {
            const d = new Date(n);
            return isNaN(d) ? undefined : d;
        }
        const d = new Date(x);
        return isNaN(d) ? undefined : d;
    }
    return undefined;
};

const parseDate = (v) => {
    if (v == null) return null;
    const n = Number(v);
    const d = Number.isFinite(n) ? new Date(n) : new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
};

const convertToObjectId = (id) => {
    return new Types.ObjectId(id);
};

function safeUser(u) {
    const obj = u.toObject ? u.toObject() : { ...u };
    delete obj.password;
    return obj;
}

function safeFmt(v, unit = "") {
    if (v === null || v === undefined) return "—";
    return `${Number(v).toFixed(v % 1 ? 2 : 0)}${unit}`;
}

const convertMarkdownToHtmlTable = (markdownText) => {
    if (!markdownText) return "<p>Không có dữ liệu chẩn đoán.</p>";

    const lines = markdownText.split("\n").filter((line) => line.trim() !== "");
    let html =
        '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-family: Arial, sans-serif;">';

    lines.forEach((line, index) => {
        const trimmedLine = line.trim();

        if (trimmedLine.includes("---")) return;
        if (!trimmedLine.startsWith("|")) {
            html += `<tr><td colspan="100%" style="padding: 8px;">${trimmedLine}</td></tr>`;
            return;
        }

        const cells = trimmedLine.replace(/^\||\|$/g, "").split("|");

        html += "<tr>";

        const isHeader = index === 0;
        const tag = isHeader ? "th" : "td";

        const bgStyle = isHeader ? "background-color: #f4f6f8; color: #1f2937; font-weight: bold;" : "color: #374151;";
        const cellStyle = `border: 1px solid #e5e7eb; padding: 12px; text-align: left; line-height: 1.5; ${bgStyle}`;

        cells.forEach((cell) => {
            let content = cell.trim().replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
            if (!content) content = "—";

            html += `<${tag} style="${cellStyle}">${content}</${tag}>`;
        });

        html += "</tr>";
    });

    html += "</table>";
    return html;
};

module.exports = {
    safeFmt,
    safeUser,
    parseDate,
    parseDateMaybe,
    convertToObjectId,
    toNumberOrUndefined,
    buildReadingFromBody,
    convertMarkdownToHtmlTable
};
