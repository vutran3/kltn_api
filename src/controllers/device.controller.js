const Device = require("../models/device.model");
const deviceService = require("../services/device.service");
const createError = require("http-errors");

module.exports = {
    createDevice: async (req, res) => {
        const { device_id, device_name, is_active, apiKey } = req.body;

        if (!device_id || !device_name) throw createError.BadRequest("device_id and device_name are required");

        const device = await deviceService.createDevice({ device_id, device_name, is_active, apiKey });

        return res.status(201).json(device);
    },

    // List (with search, filter, pagination, sort, projection)
    listDevices: async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search, // device_name & device_id
            is_active,
            sort = "-createdAt",
            select
        } = req.query;

        const filter = {};
        if (typeof is_active !== "undefined") {
            filter.is_active = is_active === "true";
        }
        if (search) {
            filter.$or = [
                { device_name: { $regex: search, $options: "i" } },
                { device_id: { $regex: search, $options: "i" } }
            ];
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const query = Device.find(filter);
        if (select) query.select(select.split(",").join(" "));
        query.sort(sort.split(",").join(" "));
        query.skip((pageNum - 1) * limitNum).limit(limitNum);

        const { items, total } = await deviceService.getDevices({
            pageNum,
            limitNum,
            select,
            sort
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

    getDeviceById: async (req, res) => {
        const device = await deviceService.getDeviceById(req.params.id);
        res.json(device);
    },

    // Get by Mongo _id
    getDeviceByDeviceId: async (req, res) => {
        const device = await deviceService.getDeviceByDeviceId(req.params.deviceId);
        res.json(device);
    },

    // Get by device_id (business id)
    updateDevice: async (req, res) => {
        const { id } = req.params;
        const payload = req.body;

        const updated = await deviceService.updateDevice({
            id,
            payload
        });

        res.json(updated);
    },

    // Delete
    deleteDevice: async (req, res) => {
        const { id } = req.params;

        const deleted = await deviceService.deleteDevice(id);

        res.json({ message: "Device deleted" });
    },

    // Activate / Deactivate
    setActive: async (req, res) => {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") throw createError.BadRequest("is_active (boolean) is required");

        const updated = await deviceService.setActive({
            id,
            is_active
        });

        res.json(updated);
    },
    // Admin/App: enqueue a command to a device (by business id)
    enqueueCommand: async (req, res) => {
        const { deviceId } = req.headers['X-Device-Id'];
        const { cmd, minutes, at } = req.body || {};
        if (!deviceId) throw createError.BadRequest("deviceId param is required");
        const item = await deviceService.enqueueCommand({ device_id: deviceId, cmd, minutes, at });
        return res.status(201).json({ ok: true, command: item });
    },

    //Admin/App: clear the queue
    cancelAllCommands: async (req, res) => {
        const { deviceId } = req.headers['X-Device-Id'];
        if (!deviceId) throw createError.BadRequest("deviceId param is required");
        const out = await deviceService.cancelAllCommands({ device_id: deviceId });
        return res.json(out);
    }
};
