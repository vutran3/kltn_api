const mongoose = require("mongoose");

const ReadingSchema = new mongoose.Schema(
    {
        deviceId: { type: String, required: true, index: true },
        ts: { type: Date, required: true, index: true }, // store as Date
        rainRaw: { type: Number },
        wetPct: { type: Number, min: 0, max: 100 },
        raining: { type: Number, enum: [0, 1] }, // 0 = no, 1 = yes
        lightRaw: { type: Number },
        lightPct: { type: Number, min: 0, max: 100 },
        lightVolt: { type: Number },
        ip: { type: String }
    },
    { timestamps: true } // createdAt, updatedAt
);

// useful compound index for queries
ReadingSchema.index({ deviceId: 1, ts: -1 });

const Reading = mongoose.model("Reading", ReadingSchema);
module.exports = Reading;
