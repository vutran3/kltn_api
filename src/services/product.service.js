const createError = require("http-errors");
const Product = require("../models/product.model");
const Device = require('../models/device.model')
const Field = require('../models/field.model')

module.exports = {
    createProduct: async (payload) => {
        try {
            // images can be string[] or undefined
            const product = await Product.create(payload);
            return product;
        } catch (error) {
            throw error;
        }
    },

    // List (with search, filter, pagination, sort, projection)
    getProducts: async ({ pageNum, limitNum, filter = {}, sort = "-createdAt", select, populate }) => {
        try {
            const query = Product.find(filter);
            if (select) query.select(select.split(",").join(" "));
            query.sort(sort.split(",").join(" "));
            query.skip((pageNum - 1) * limitNum).limit(limitNum);

            // optional populate: ?populate=field
            if (populate && String(populate).split(",").includes("field")) {
                query.populate("field", "name field_type is_active");
            }

            const [items, total] = await Promise.all([query, Product.countDocuments(filter)]);
            return { items, total };
        } catch (error) {
            throw error;
        }
    },

    getProductById: async (id, { populate } = {}) => {
        try {
            let q = Product.findById(id);
            if (populate && String(populate).split(",").includes("field")) {
                q = q.populate("field", "name field_type is_active");
            }
            const product = await q;
            if (!product) throw createError.NotFound("Product not found");
            return product;
        } catch (error) {
            throw error;
        }
    },
    getProductByDeviceId: async (deviceId) => {
        const device = await Device.findOne({device_id: deviceId}).select({apiKey: -1}).lean();
        if(!device)  throw createError.NotFound('Device is not found !')
        
        const field = await Field.findOne({devices: device._id}).lean();

        if(!field) throw createError.NotFound('Field is not found')
        
        const product = await Product.findOne({field: field._id})
        .select('-_id')
        .lean();

        return product;
    },
    updateProduct: async ({ id, payload }) => {
        try {
            const updated = await Product.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
            if (!updated) throw createError.NotFound("Product not found");
            return updated;
        } catch (error) {
            throw error;
        }
    },

    deleteProduct: async (id) => {
        try {
            const deleted = await Product.findByIdAndDelete(id);
            if (!deleted) throw createError.NotFound("Product not found");
        } catch (error) {
            throw error;
        }
    }
};
