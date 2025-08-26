const mongoose = require("mongoose");

const DOCUMENT_NAME = "Product";
const COLLECTION_NAME = "products";

const productSchema = new mongoose.Schema(
    {
        field: { type: mongoose.Schema.Types.ObjectId, ref: "Field", required: true },
        name: { type: String, required: true },
        type: String,
        planting_date: Date,
        expected_harvest_date: Date,
        actual_harvest_date: Date,
        weight_unit: String,
        price_per_unit: Number,
        status: {
            type: String,
            enum: ["growing", "harvesting", "procesing"]
        },
        images: [String]
    },
    { collection: COLLECTION_NAME }
);

module.exports = mongoose.model(DOCUMENT_NAME, productSchema);
