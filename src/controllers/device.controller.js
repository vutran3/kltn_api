const deviceService = require("../services/device.service");
const createError = require("http-errors");

module.exports = {
    createDevice: async (req, res) => {
        const { device_id, device_name, is_active, apiKey } = req.body;
        if (!device_id || !device_name) throw createError.BadRequest("device_id and device_name are required");

        const owner = res.locals?.user?._id;

        const device = await deviceService.createDevice({ device_id, device_name, is_active, apiKey, owner });
        return res.status(201).json(device);
    },

    // List (with search, filter, pagination, sort, projection)
    listDevices: async (req, res) => {
        const { page = 1, limit = 10, search, is_active, sort = "-createdAt", select } = req.query;
        const owner = res.locals?.user?._id;
        const filter = { owner };
        if (typeof is_active !== "undefined") filter.is_active = is_active === "true";
        if (search) {
            filter.$or = [
                { device_name: { $regex: search, $options: "i" } },
                { device_id: { $regex: search, $options: "i" } }
            ];
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const { items, total } = await deviceService.getDevices({
            pageNum,
            limitNum,
            filter,
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

    myDevices: async (req, res) => {
        const { items } = await deviceService.getDevices({
            filter: {
                owner: res.locals.user._id
            }
        });

        res.json({
            msg: "Lấy danh sách thiết bị thành công",
            data: items
        });
    },

    getDeviceByDeviceId: async (req, res) => {
        const device = await deviceService.getDeviceByDeviceId(req.params.deviceId);
        res.json(device);
    },

    updateDevice: async (req, res) => {
        const { id } = req.params;
        const payload = req.body;

        const updated = await deviceService.updateDevice({
            id,
            payload
        });

        res.json(updated);
    },

    deleteDevice: async (req, res) => {
        const { id } = req.params;
        await deviceService.deleteDevice(id);
        res.json({ message: "Xóa thiết bị thành công" });
    },

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
    unassignedDevices: async (req, res) => {
        if (!res.locals?.user?._id) throw createError.Unauthorized("Vui lòng đăng nhập");

        const { page = 1, limit = 10, search, is_active, sort = "-createdAt" } = req.query;
        const ownerId = res.locals.user._id;

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const { items, total } = await deviceService.getUnassignedDevices({
            ownerId,
            pageNum,
            limitNum,
            search,
            is_active,
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
    }
};
