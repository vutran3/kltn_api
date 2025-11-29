const createError = require("http-errors");
const productService = require("../services/product.service");

const STATUS_ENUM = ["growing", "harvesting", "procesing"];
const Product = require("../models/product.model");
const Field = require("../models/field.model");
const HealthCheck = require("../models/healthcheck.model");

const { ReadingBucket, METRICS } = require("../models/reading.model");
const OpenAI = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

function parseDateRange(req) {
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000); // default 7 days
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error("Invalid from/to date");
    }
    return { from, to };
}

module.exports = {
    createProduct: async (req, res) => {
        const {
            field,
            name,
            type,
            planting_date,
            expected_harvest_date,
            actual_harvest_date,
            weight_unit,
            price_per_unit,
            status,
            images
        } = req.body;
        const owner = res.locals?.user?._id;

        if (!field || !name) throw createError.BadRequest("field and name are required");
        if (status && !STATUS_ENUM.includes(status)) {
            throw createError.BadRequest(`status must be one of: ${STATUS_ENUM.join(", ")}`);
        }

        const product = await productService.createProduct({
            field,
            name,
            owner,
            type,
            planting_date,
            expected_harvest_date,
            actual_harvest_date,
            weight_unit,
            price_per_unit,
            status,
            images
        });

        return res.status(201).json(product);
    },

    // List (search, filter, pagination, sort, projection)
    listProducts: async (req, res) => {
        const { page = 1, limit = 10, search, field, status, sort = "-createdAt", select, populate } = req.query;
        const owner = res.locals?.user?._id;
        const filter = { owner };
        if (field) filter.field = field;
        if (status) filter.status = status;
        if (search) {
            filter.$or = [{ name: { $regex: search, $options: "i" } }, { type: { $regex: search, $options: "i" } }];
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const { items, total } = await productService.getProducts({
            pageNum,
            limitNum,
            filter,
            sort,
            select,
            populate
        });

        res.json({
            items,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    },

    getProductById: async (req, res) => {
        const { populate } = req.query;
        const product = await productService.getProductById(req.params.id, { populate });
        res.json(product);
    },
    getProductByDeviceId: async (req, res) => {
        const deviceId = req.params.deviceId;
        const product = await productService.getProductByDeviceId(deviceId);
        res.json(product);
    },
    updateProduct: async (req, res) => {
        const { id } = req.params;
        const payload = req.body;

        if (payload.status) {
            const STATUS_ENUM = ["growing", "harvesting", "selling"];
            if (!STATUS_ENUM.includes(payload.status)) {
                throw createError.BadRequest(`status must be one of: ${STATUS_ENUM.join(", ")}`);
            }
        }

        const updated = await productService.updateProduct({ id, payload });
        res.json(updated);
    },

    deleteProduct: async (req, res) => {
        const { id } = req.params;
        await productService.deleteProduct(id);
        res.json({ message: "Product deleted" });
    },

    getProductDetails: async (req, res) => {
        try {
            let to;
            let from = null;
            const now = new Date();
            const { productId } = req.params;

            const product = await Product.findById(productId).lean();
            if (!product) return res.status(404).json({ message: "Product not found" });

            if (product.planting_date) from = new Date(product.planting_date);
            else from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            if (product.actual_harvest_date) to = new Date(product.actual_harvest_date);
            else to = now;

            // fallback
            if (from > to) from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

            const field = await Field.findById(product.field).populate("devices").lean();

            if (!field) return res.status(404).json({ message: "Field not found for product" });

            const devices = field.devices || [];
            const deviceIds = devices.map((d) => d.device_id).filter(Boolean);

            const healthChecks = await HealthCheck.find({
                device_id: { $in: deviceIds },
                inspection_date: {
                    $gte: from,
                    $lte: to
                }
            }).lean();

            const deviceReadingPromises = deviceIds.map(async (deviceId) => {
                const latest = await ReadingBucket.getLatest(deviceId);
                const bucketsAvg = await ReadingBucket.avgByBuckets(deviceId, from, to);
                const rawReadings = await ReadingBucket.queryRange(deviceId, from, to);

                return {
                    deviceId,
                    latest,
                    bucketsAvg,
                    rawReadings
                };
            });

            const deviceReadings = await Promise.all(deviceReadingPromises);

            // const sensorSummary = deviceReadings.map((d) => {
            //     const last = d.latest || {};
            //     const lastMetrics = {};
            //     METRICS.forEach((m) => {
            //         if (typeof last[m] === "number") lastMetrics[m] = last[m];
            //     });

            //     const avgMetrics = {};
            //     if (d.bucketsAvg.length > 0) {
            //         METRICS.forEach((m) => {
            //             const vals = d.bucketsAvg.map((b) => b.avg?.[m]).filter((v) => typeof v === "number");
            //             if (vals.length) {
            //                 const sum = vals.reduce((a, b) => a + b, 0);
            //                 avgMetrics[m] = sum / vals.length;
            //             }
            //         });
            //     }

            //     return {
            //         deviceId: d.deviceId,
            //         latest: lastMetrics,
            //         avgRange: avgMetrics
            //     };
            // });

            // const diseaseSummary = healthChecks.map((hc) => ({
            //     inspection_date: hc.inspection_date,
            //     device_id: hc.device_id,
            //     predicting_description: hc.predicting_description,
            //     image_url: hc.image_predetect?.image_url,
            //     ai_prediction: hc.ai_prediction
            // }));

            // const systemPrompt = `
            //     You are an agronomist and food quality expert.
            //     Given sensor data from the field and disease detection results, analyze
            //     the overall quality of the vegetables for this product and explain in clear, simple terms.
            //     Focus on:
            //     - Current health status (good, warning, critical)
            //     - Main risks or detected diseases (if any)
            //     - Environment conditions compared to typical optimal ranges
            //     - Short, actionable advice for the farmer (1–3 bullet points).
            //     Return answer in Vietnamese, friendly but concise.
            // `.trim();

            // const userContent = {
            //     product: {
            //         name: product.name,
            //         type: product.type,
            //         planting_date: product.planting_date,
            //         expected_harvest_date: product.expected_harvest_date,
            //         actual_harvest_date: product.actual_harvest_date,
            //         status: product.status
            //     },
            //     field: {
            //         name: field.name,
            //         total_area: field.total_area,
            //         description: field.description
            //     },
            //     sensorSummary,
            //     diseaseSummary
            // };

            // const completion = await openai.chat.completions.create({
            //     model: "gpt-4o-mini",
            //     messages: [
            //         { role: "system", content: systemPrompt },
            //         {
            //             role: "user",
            //             content:
            //                 "Dữ liệu cảm biến và lịch sử phát hiện bệnh (JSON):\n" +
            //                 JSON.stringify(userContent, null, 2)
            //         }
            //     ],
            //     temperature: 0.4
            // });

            // const aiQualityDescription = completion.choices[0]?.message?.content?.trim() || "";

            return res.json({
                product,
                field: {
                    _id: field._id,
                    name: field.name,
                    total_area: field.total_area,
                    description: field.description,
                    devices: devices.map((d) => ({
                        _id: d._id,
                        name: d.name,
                        device_id: d.device_id
                    }))
                },
                healthCheck_history: healthChecks,
                readings: {
                    range: { from, to },
                    devices: deviceReadings
                }
                // ai_quality_description: aiQualityDescription
            });
        } catch (err) {
            console.error("getProductDetails error:", err);
            return res.status(500).json({ message: err.message || "Internal server error" });
        }
    }
};
