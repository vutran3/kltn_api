const createError = require("http-errors");
const Field = require("../models/field.model");
const fieldService = require("../services/field.service");

module.exports = {
    createField: async (req, res) => {
        const { name, devices, owner, established_date, description, total_area, field_type, is_active } = req.body;

        if (!name) throw createError.BadRequest("name is required");

        const field = await fieldService.createField({
            name,
            devices,
            owner,
            established_date,
            description,
            total_area,
            field_type,
            is_active
        });

        return res.status(201).json(field);
    },

    // List (with search, filter, pagination, sort, projection)
    listFields: async (req, res) => {
        const {
            page = 1,
            limit = 10,
            search, // name & field_type
            is_active,
            sort = "-createdAt",
            select,
            populate
        } = req.query;

        const filter = {};
        if (typeof is_active !== "undefined") filter.is_active = is_active === "true";
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { field_type: { $regex: search, $options: "i" } }
            ];
        }

        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

        const { items, total } = await fieldService.getFields({
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

    getFieldById: async (req, res) => {
        const { populate } = req.query;
        const field = await fieldService.getFieldById(req.params.id, { populate });
        res.json(field);
    },

    updateField: async (req, res) => {
        const { id } = req.params;
        const payload = req.body;

        const updated = await fieldService.updateField({ id, payload });
        res.json(updated);
    },

    deleteField: async (req, res) => {
        const { id } = req.params;
        await fieldService.deleteField(id);
        res.json({ message: "Field deleted" });
    },

    // Activate / Deactivate
    setActive: async (req, res) => {
        const { id } = req.params;
        const { is_active } = req.body;

        if (typeof is_active !== "boolean") throw createError.BadRequest("is_active (boolean) is required");

        const updated = await fieldService.setActive({ id, is_active });
        res.json(updated);
    }
};
