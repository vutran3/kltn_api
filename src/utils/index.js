module.exports = {
    toNumberOrUndefined(v) {
        if (v === null || v === undefined || v === "") return undefined;
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
    },

    toReadingDataResponse(r) {
        return {
            id: r._id.toString(),
            deviceId: r.deviceId,
            ts: new Date(r.ts).getTime(),
            rainRaw: r.rainRaw ?? null,
            wetPct: r.wetPct ?? null,
            raining: r.raining ?? null,
            lightRaw: r.lightRaw ?? null,
            lightPct: r.lightPct ?? null,
            lightVolt: r.lightVolt ?? null,
            ip: r.ip || null,
            createdAt: r.createdAt ? new Date(r.createdAt).getTime() : null
        };
    }
};
