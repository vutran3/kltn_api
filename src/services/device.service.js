const Device = require("../models/device.model");
const createError = require("http-errors");

module.exports = {
    createDevice: async ({ device_id, device_name, is_active, apiKey }) => {
        try {
            const existed = await Device.findOne({ device_id });

            if (existed) throw createError.Conflict("device_id already exists");

            const device = await Device.create({ device_id, device_name, is_active, apiKey });

            return device;
        } catch (error) {
            throw error;
        }
    },

    // List (with search, filter, pagination, sort, projection)
    getDevices: async ({ pageNum, limitNum, filter, sort }) => {
        try {
            const query = Device.find(filter);
            query.sort(sort.split(",").join(" "));
            query.skip((pageNum - 1) * limitNum).limit(limitNum);

            const [items, total] = await Promise.all([query, Device.countDocuments(filter)]);

            return {
                items,
                total
            };
        } catch (error) {
            throw error;
        }
    },

    getDeviceById: async (id) => {
        try {
            const device = await Device.findById(id);

            if (!device) throw createError.NotFound("Device not found");

            return device;
        } catch (error) {
            throw error;
        }
    },

    // Get by Mongo _id
    getDeviceByDeviceId: async (device_id) => {
        try {
            const device = await Device.findOne({ device_id });

            if (!device) throw createError.NotFound("Device not found");

            return device;
        } catch (error) {
            throw error;
        }
    },

    // Get by device_id (business id)
    updateDevice: async ({ id, payload }) => {
        try {
            // Prevent device_id overwrite collision
            if (payload.device_id) {
                const exists = await Device.findOne({ device_id: payload.device_id, _id: { $ne: id } });
                if (exists) throw createError.Conflict("device_id already exists");
            }

            const updated = await Device.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
            if (!updated) throw createError.NotFound("Device not found");
            return updated;
        } catch (error) {
            throw error;
        }
    },

    // Delete
    deleteDevice: async (id) => {
        try {
            const deleted = await Device.findByIdAndDelete(id);

            if (!deleted) throw createError.NotFound("Device not found");
        } catch (error) {
            throw error;
        }
    },

    // Activate / Deactivate
    setActive: async ({ id, is_active }) => {
        try {
            if (typeof is_active !== "boolean") throw createError.BadRequest("is_active (boolean) is required");

            const updated = await Device.findByIdAndUpdate(id, { is_active }, { new: true });

            if (!updated) throw createError.NotFound("Device not found");

            return updated;
        } catch (error) {
            throw error;
        }
    }
};
