const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const [COL, DOC] = ["devices", "Device"];

const deviceSchema = new Schema(
    {
        device_id: {
            type: String,
            required: true
        },
        owner: { type: Schema.Types.ObjectId, ref: "User" },
        device_name: {
            type: String,
            required: true
        },
        is_active: {
            type: Boolean,
            default: true
        },
        apiKey: String
    },
    {
        collection: COL,
        timestamps: true
    }
);

const Device = model(DOC, deviceSchema);

module.exports = Device;
