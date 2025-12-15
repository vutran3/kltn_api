const { model, Schema } = require("mongoose");

const [COL, DOC] = ["rags", "Rag"];

const RagSchema = new Schema(
    {
        device_id: String,
        detect_date: Date,
        description: String,
        expert_feedback: String,
        image: Buffer,
        relative_image: Buffer,
        isSend: {
            type: Boolean,
            default: false
        }
    },
    { collection: COL, timestamps: true }
);

const Rag = new model(DOC, RagSchema);

module.exports = Rag;
