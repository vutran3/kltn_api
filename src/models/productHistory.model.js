const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "ProductHistory";
const COLLECTION_NAME = "product_histories";

const productHistorySchema = new Schema(
    {
        device_id: { type: String, required: true },
        processType: {
            type: String,
            required: true,
            default: "other"
        },
        process_date: { type: Date, default: Date.now() },
        notes: { type: String, default: "" },
        image: { type: String, default: "" }
    },
    {
        timestamps: true,
        collection: COLLECTION_NAME
    }
);

const ProductHistory = model(DOCUMENT_NAME, productHistorySchema);

module.exports = ProductHistory;
