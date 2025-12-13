const { Types } = require("mongoose");
const ProductHistory = require("../models/productHistory.model");
const { BadRequestError } = require("../core/error.response");

const toOid = (v) => (Types.ObjectId.isValid(String(v)) ? new Types.ObjectId(String(v)) : null);

class ProductHistoryService {
    static async createHistory({ device_id, processType, process_date, notes, image }) {
        try {
            if (!device_id) throw new BadRequestError("Device ID is required");
            const newHistory = await ProductHistory.create({
                device_id: device_id,
                processType,
                process_date: process_date || new Date(),
                notes,
                image
            });

            return newHistory;
        } catch (error) {
            throw error;
        }
    }
    static async getListHistory({
        page = 1,
        limit = 10,
        device_id,
        process_date_start,
        process_date_end,
        sort = "ctime"
    }) {
        try {
            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Math.max(1, Number(limit) || 10);
            const skip = (pageNum - 1) * limitNum;

            const filter = {};
            if (device_id) filter.device_id = device_id;

            // --- THÊM LOGIC LỌC NGÀY ---
            if (process_date_start || process_date_end) {
                filter.process_date = {};
                if (process_date_start) {
                    filter.process_date.$gte = new Date(process_date_start);
                }
                if (process_date_end) {
                    filter.process_date.$lte = new Date(process_date_end);
                }
            }
            // ---------------------------

            // Logic sort vẫn giữ nguyên: nếu không truyền sort thì mặc định là ctime (mới nhất trước)
            const sortMap = { ctime: { process_date: -1 }, old: { process_date: 1 } };
            const sortBy = sortMap[sort] || sortMap["ctime"];

            const [items, total] = await Promise.all([
                ProductHistory.find(filter).sort(sortBy).skip(skip).limit(limitNum).lean(),
                ProductHistory.countDocuments(filter)
            ]);

            const totalPages = Math.max(1, Math.ceil(total / limitNum));

            return {
                results: items,
                pagination: {
                    totalResult: total,
                    pageNum,
                    limitNum,
                    totalPages,
                    hasNext: pageNum < totalPages,
                    hasPrev: pageNum > 1
                }
            };
        } catch (error) {
            throw error;
        }
    }

    static async updateHistory({ historyId, updates }) {
        try {
            if (!historyId) throw new BadRequestError("History ID required");
            const allowedUpdates = ["processType", "process_date", "notes", "image"];
            const cleanUpdates = {};
            Object.keys(updates).forEach((key) => {
                if (allowedUpdates.includes(key)) cleanUpdates[key] = updates[key];
            });

            const updatedHistory = await ProductHistory.findByIdAndUpdate(toOid(historyId), cleanUpdates, {
                new: true
            });
            if (!updatedHistory) throw new BadRequestError("History not found");
            return updatedHistory;
        } catch (error) {
            throw error;
        }
    }

    static async deleteHistory({ historyId }) {
        try {
            if (!historyId) throw new BadRequestError("History ID is required");

            const result = await ProductHistory.deleteOne({ _id: toOid(historyId) });
            if (result.deletedCount === 0) throw new BadRequestError("History not found");

            return { deletedCount: result.deletedCount };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = ProductHistoryService;
