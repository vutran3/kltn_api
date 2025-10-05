const createError = require("http-errors");
const productService = require("../services/product.service");

const STATUS_ENUM = ["growing", "harvesting", "procesing"];

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

        if (!field || !name) throw createError.BadRequest("field and name are required");
        if (status && !STATUS_ENUM.includes(status)) {
            throw createError.BadRequest(`status must be one of: ${STATUS_ENUM.join(", ")}`);
        }

        const product = await productService.createProduct({
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
        });

        return res.status(201).json(product);
    },

    // List (with search, filter, pagination, sort, projection)
    listProducts: async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search, // name & type
            field,
            status, // growing | harvesting | procesing
            sort = "-createdAt",
            select,
            populate
        } = req.query;

        const filter = {};
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
        res.json(product)
    },
    updateProduct: async (req, res) => {
        const { id } = req.params;
        const payload = req.body;

        if (payload.status) {
            const STATUS_ENUM = ["growing", "harvesting", "procesing"];
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
    }
};
