const mongoose = require("mongoose");
const [COL, DOC] = ["schedules", "Schedule"];

const ScheduleSchema = new mongoose.Schema(
    {
        device_id: { type: String, required: true, index: true, unique: true },
        is_active: { type: Boolean, default: false },
        schedule_ms: { type: Date, default: null },
        duration_ms: { type: Number, default: 0 },
        off_at: { type: Date, default: null }
    },
    { timestamps: true, collection: COL }
);

const Schedule = mongoose.model(DOC, ScheduleSchema);
module.exports = Schedule;
    