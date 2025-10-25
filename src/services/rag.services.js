const Embedding = require("../models/embedding.model");
const { VECTOR_INDEX, VECTOR_PATH, VECTOR_API } = process.env;

class RagServices {
    static uploadImageToMongoDBCloud = async ({ vectorImages = [], bufferImages = [], content = "" }) => {
        if (bufferImages.length !== vectorImages.length) {
            throw new Error(
                `bufferImages (${bufferImages.length}) và vectorImages (${vectorImages.length}) không khớp độ dài`
            );
        }

        if (Embedding.db.readyState !== 1) await Embedding.db.asPromise();

        const docs = bufferImages.map((buf, idx) => ({
            type: "image",
            imageData: buf,
            contentType: "image/png",
            content,
            embedding: vectorImages[idx]
        }));

        return await Embedding.insertMany(docs, { ordered: false });
    };

    static async getRelatedData({ image }) {
        console.log(VECTOR_API);
        try {
            const vectorResult = await fetch(VECTOR_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: image
            })
                .then((response) => response.json())
                .then((data) => data.vector)
                .catch((error) => {
                    console.error("Error:", error);
                });

            const result = await Embedding.aggregate([
                {
                    $vectorSearch: {
                        index: VECTOR_INDEX,
                        queryVector: vectorResult,
                        path: VECTOR_PATH,
                        numCandidates: 100,
                        limit: 1
                    }
                },
                {
                    $project: {
                        _id: 0,
                        content: 1,
                        type: 1,
                        imageData: 1
                    }
                }
            ]);

            return result;
        } catch (error) {
            console.log(error);
            throw error;
        }
    }
}

module.exports = RagServices;
