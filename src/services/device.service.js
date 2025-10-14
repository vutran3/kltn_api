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
    // Enqueue a command for a device (by device_id)
    enqueueCommand: async ({ device_id, cmd, minutes, at }) => {
        try {
            if (!device_id) throw createError.BadRequest("device_id is required");
            if (!["on", "off", "on_for", "schedule", "cancel"].includes(cmd)) {
                throw createError.BadRequest("invalid cmd");
            }
            if (cmd === "on_for" && !minutes) {
                throw createError.BadRequest("minutes is required for on_for");
            }
            if (cmd === "schedule" && (!minutes || !at)) {
                throw createError.BadRequest("at and minutes are required for schedule");
            }

            const dev = await Device.findOne({ device_id });
            if (!dev) throw createError.NotFound("Device not found");

            const item = { cmd, minutes, at, enqueuedAt: new Date() };
            dev.commandQueue = dev.commandQueue || [];
            dev.commandQueue.push(item);
            await dev.save();
            return item;
        } catch (error) {
            throw error;
        }
    },

    // Pop next command (FIFO) for device (called by firmware poller)
    nextCommandForDevice: async ({ device_id }) => {
        try {
            if (!device_id) throw createError.BadRequest("device_id is required");
            const dev = await Device.findOne({ device_id });
            if (!dev) throw createError.NotFound("Device not found");

            const q = dev.commandQueue || [];
            const idx = q.findIndex(c => !c.consumedAt);
            if (idx === -1) return null; // no command

            dev.commandQueue[idx].consumedAt = new Date();
            await dev.save();

            const { cmd, minutes, at } = q[idx];
            return { cmd, minutes, at };
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
    },
    // Upsert last status posted by device firmware
    upsertStatus: async ({ device_id, on, hasSchedule, now, schedStart, schedEnd }) => {
        try {
            if (!device_id) throw createError.BadRequest("device_id is required");
            const dev = await Device.findOne({ device_id });
            if (!dev) throw createError.NotFound("Device not found");

            dev.lastStatus = {
                on: !!on,
                hasSchedule: !!hasSchedule,
                now: Number(now) || 0,
                schedStart: Number(schedStart) || 0,
                schedEnd: Number(schedEnd) || 0,
            };
            dev.lastSeenAt = new Date();
            await dev.save();
            return dev.lastStatus;
        } catch (error) {
            throw error;
        }
    },
     // clear all queued commands
    cancelAllCommands: async ({ device_id }) => {
        try {
            if (!device_id) throw createError.BadRequest("device_id is required");
            const dev = await Device.findOne({ device_id });
            if (!dev) throw createError.NotFound("Device not found");
            dev.commandQueue = [];
            await dev.save();
            return { ok: true };
        } catch (error) {
            throw error;
        }
    },
};
