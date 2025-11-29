const mongoose = require("mongoose");
const [COL, DOC] = ["schedules", "Schedule"];

const HistorySchema = new mongoose.Schema(
    {
        action: { type: String, enum: ["ON", "OFF"], required: true },
        source: { type: String, enum: ["manual", "schedule", "timer", "timer-auto"], required: true },
        at: { type: Date, default: Date.now }
    },
    { _id: false, timestamps: false }
);

const ScheduleSchema = new mongoose.Schema(
    {
        device_id: { type: String, required: true },
        type: {
            type: String,
            enum: ["pump", "light"],
            required: true
        },
        is_active: { type: Boolean, default: false },
        schedule_ms: { type: Date, default: null },
        duration_ms: { type: Number, default: 0 },
        off_at: { type: Date, default: null },
        history: { type: [HistorySchema], default: [] }
    },
    { timestamps: true, collection: COL }
);

ScheduleSchema.methods.pushHistory = function (entry) {
    this.history.unshift(entry);
    if (this.history.length > 500) this.history = this.history.slice(0, 500);
};

const Schedule = mongoose.model(DOC, ScheduleSchema);
module.exports = Schedule;
