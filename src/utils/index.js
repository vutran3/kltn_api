const { Types } = require("mongoose");

const toNumberOrUndefined = (v) => {
    if (v === null || v === undefined || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
};

const buildReadingFromBody = (b, ts) => {
    const soilHumidity =
        typeof b.soilHumidity !== "undefined" ? toNumberOrUndefined(b.soilHumidity) : toNumberOrUndefined(b.wetPct);

    return {
        t: ts,
        airTemperature: toNumberOrUndefined(b.airTemperature),
        airHumidity: toNumberOrUndefined(b.airHumidity),
        lightRaw: toNumberOrUndefined(b.lightRaw),
        rainRaw: toNumberOrUndefined(b.rainRaw),
        soilTemperature: toNumberOrUndefined(b.soilTemperature),
        soilHumidity: soilHumidity,
        nitrogen: toNumberOrUndefined(b.nitrogen),
        phosphorus: toNumberOrUndefined(b.phosphorus),
        potassium: toNumberOrUndefined(b.potassium),
        ph: toNumberOrUndefined(b.ph)
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

module.exports = {
    safeUser,
    toNumberOrUndefined,
    buildReadingFromBody,
    parseDateMaybe,
    parseDate,
    convertToObjectId
};
