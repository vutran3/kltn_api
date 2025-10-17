const Schedule = require("../models/schedule.model");

const nowMs = () => Date.now();

function toResponse(dc, effectiveActive) {
    const schedule_ms = dc.schedule_ms ? dc.schedule_ms.getTime() : 0;
    return {
        device_id: dc.device_id,
        is_active: typeof effectiveActive === "boolean" ? effectiveActive : !!dc.is_active,
        schedule_ms,
        duration_ms: dc.duration_ms || 0,
        now_ms: nowMs(),
        version: dc.updatedAt ? dc.updatedAt.getTime() : 0
    };
}

function toMillisMaybe(v) {
    if (v == null) return null;
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))) return Number(v);
    return null;
}

function computeOffAt(scheduleDate, durationMs) {
    if (!durationMs || durationMs <= 0) return null;
    const start = scheduleDate instanceof Date ? scheduleDate.getTime() : nowMs();
    return new Date(start + durationMs);
}

module.exports = {
    getDeviceControl: async (req, res) => {
        const deviceId = (req.query.device_id || req.get("X-Device-Id") || "").trim();
        if (!deviceId) return res.status(400).json({ error: "device_id required" });

        let doc = await Schedule.findOne({ device_id: deviceId });
        if (!doc) {
            doc = await Schedule.create({
                device_id: deviceId,
                is_active: false,
                schedule_ms: null,
                duration_ms: 0,
                off_at: null
            });
        }

        const now = nowMs();
        const hasSchedule = !!doc.schedule_ms;
        const scheduleAt = hasSchedule ? doc.schedule_ms.getTime() : 0;
        const offAtMs = doc.off_at ? doc.off_at.getTime() : 0;

        // is_active chỉ "có hiệu lực" khi (đã đến giờ nếu có schedule) và (chưa quá hạn nếu có off_at)
        const startedOk = !hasSchedule || now >= scheduleAt;
        const notExpired = !offAtMs || now < offAtMs;
        const effectiveActive = !!doc.is_active && startedOk && notExpired;

        // Nếu đã quá hạn mà DB vẫn bật -> dọn sạch async
        if (doc.is_active && offAtMs && now >= offAtMs) {
            Schedule.updateOne(
                { device_id: deviceId },
                { $set: { is_active: false, off_at: null, duration_ms: 0, schedule_ms: null } }
            ).catch(() => {});
        }

        // Nếu đã đến giờ khởi động mà chưa có off_at nhưng có duration_ms>0, đảm bảo off_at được tính đúng (phòng case ghi thiếu)
        if (doc.is_active && startedOk && !offAtMs && doc.duration_ms > 0) {
            const newOffAt = computeOffAt(doc.schedule_ms, doc.duration_ms);
            if (newOffAt) {
                await Schedule.updateOne({ device_id: deviceId }, { $set: { off_at: newOffAt } }).catch(() => {});
                doc.off_at = newOffAt;
            }
        }

        res.status(200).json(toResponse(doc, effectiveActive));
    },

    updateDeviceControl: async (req, res) => {
        let { device_id, is_active, schedule_ms, duration_ms } = req.body || {};
        if (!device_id) return res.status(400).json({ error: "device_id required" });
        console.log({
            device_id,
            is_active,
            schedule_ms,
            duration_ms
        });
        const scheduleMsNum = toMillisMaybe(schedule_ms);
        const durationMsNum = toMillisMaybe(duration_ms);

        const doc = (await Schedule.findOne({ device_id })) || new Schedule({ device_id });

        const hasIsActive = typeof is_active === "boolean";
        const hasSchedule = typeof scheduleMsNum === "number";
        const hasDuration = typeof durationMsNum === "number";

        if (hasIsActive) doc.is_active = is_active;
        if (hasSchedule) doc.schedule_ms = scheduleMsNum > 0 ? new Date(scheduleMsNum) : null;
        if (hasDuration) doc.duration_ms = durationMsNum;

        // Quy ước:
        // - Nếu tắt chủ động => clear hết.
        // - Nếu is_active=true => off_at = (schedule_ms || now) + duration_ms (nếu duration_ms>0).
        // - Nếu không gửi is_active nhưng gửi schedule_ms/duration_ms:
        //    + Giữ nguyên doc.is_active hiện tại.
        //    + Trường hợp thường dùng cho "đặt lịch bật": bạn nên gửi is_active=true cùng schedule_ms.

        if (doc.is_active === false) {
            doc.off_at = null;
            doc.duration_ms = 0;
            doc.schedule_ms = null;
        } else if (doc.is_active === true) {
            doc.off_at = computeOffAt(doc.schedule_ms, doc.duration_ms);
        }

        await doc.save();
        return res.json(toResponse(doc));
    }
};
