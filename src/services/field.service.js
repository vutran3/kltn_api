const createError = require("http-errors");
const Field = require("../models/field.model");

module.exports = {
    createField: async (payload) => {
        try {
            const field = await Field.create(payload);
            return field;
        } catch (error) {
            throw error;
        }
    },

    // List (with search, filter, pagination, sort, projection)
    getFields: async ({ pageNum, limitNum, filter = {}, sort = "-createdAt", select, populate }) => {
        try {
            const query = Field.find(filter);
            if (select) query.select(select.split(",").join(" "));
            query.sort(sort.split(",").join(" "));
            query.skip((pageNum - 1) * limitNum).limit(limitNum);

            // optional populate: ?populate=devices
            if (populate && String(populate).split(",").includes("devices")) {
                query.populate("devices", "device_id device_name is_active");
            }

            const [items, total] = await Promise.all([query, Field.countDocuments(filter)]);
            return { items, total };
        } catch (error) {
            throw error;
        }
    },

    getFieldById: async (id, { populate } = {}) => {
        try {
            let q = Field.findById(id);
            if (populate && String(populate).split(",").includes("devices")) {
                q = q.populate("devices", "device_id device_name is_active");
            }
            const field = await q;
            if (!field) throw createError.NotFound("Field not found");
            return field;
        } catch (error) {
            throw error;
        }
    },

    updateField: async ({ id, payload }) => {
        try {
            const updated = await Field.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
            if (!updated) throw createError.NotFound("Field not found");
            return updated;
        } catch (error) {
            throw error;
        }
    },

    deleteField: async (id) => {
        try {
            const deleted = await Field.findByIdAndDelete(id);
            if (!deleted) throw createError.NotFound("Field not found");
        } catch (error) {
            throw error;
        }
    },

    setActive: async ({ id, is_active }) => {
        try {
            const updated = await Field.findByIdAndUpdate(id, { is_active }, { new: true });
            if (!updated) throw createError.NotFound("Field not found");
            return updated;
        } catch (error) {
            throw error;
        }
    }
};
