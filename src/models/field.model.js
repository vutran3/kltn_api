const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "Field";
const COLLECTION_NAME = "fields";

const fieldSchema = new Schema(
    {
        name: { type: String, required: true },
        devices: { type: [Schema.Types.ObjectId], ref: "Device" },
        owner: { type: Schema.Types.ObjectId, ref: "User" },
        established_date: { type: Date },
        description: { type: String },
        total_area: { type: Number },
        field_type: { type: String },
        is_active: { type: Boolean, default: true }
    },
    { collection: COLLECTION_NAME }
);

const Field = model(DOCUMENT_NAME, fieldSchema);
module.exports = Field;
