const { Schema, model } = require("mongoose");

const DOCUMENT_NAME = "Product";
const COLLECTION_NAME = "products";

const productSchema = new Schema(
    {
        field: { type: Schema.Types.ObjectId, ref: "Field", required: true },
        owner: { type: Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        type: String,
        planting_date: Date,
        expected_harvest_date: Date,
        actual_harvest_date: Date,
        weight_unit: String,
        price_per_unit: Number,
        status: {
            type: String,
            enum: ["growing", "harvesting", "selling"]
        },
        image: String
    },
    { collection: COLLECTION_NAME }
);

module.exports = model(DOCUMENT_NAME, productSchema);
