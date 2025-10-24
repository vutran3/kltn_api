const mongoose = require("mongoose");

const ImageEmbeddingSchema = new mongoose.Schema(
    {
        type: { type: String, default: "image" },
        imageData: { type: Buffer, required: true },
        contentType: { type: String, default: "image/png" },
        content: { type: String, default: "" },
        embedding: { type: [Number], required: true }
    },
    { timestamps: true, collection: "image_embeddings" }
);

const Embedding = mongoose.model("ImageEmbedding", ImageEmbeddingSchema);

module.exports = Embedding;
