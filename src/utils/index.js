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

module.exports = {
    toNumberOrUndefined,
    buildReadingFromBody,
    parseDateMaybe
};
