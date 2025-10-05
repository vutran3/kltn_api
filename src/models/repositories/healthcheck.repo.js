const { BadRequestError } = require("../../core/error.response");
const { parseDate } = require("../../utils");
const healthCheck = require("../healthcheck.model");

const insertPredictHealth = async (payload) => {
    const { deviceId, weekStartAt, image_predetect, ai_description, ai_prediction } = payload;
    return await healthCheck.findOneAndUpdate(
        { device_id: deviceId, inspection_date: weekStartAt },
        {
            device_id: deviceId,
            inspection_date: weekStartAt,
            predicting_description: ai_description,
            image_predetect: image_predetect,
            ai_prediction
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
};

const findAllCheckResults = async ({ limit, page, sort, from, to, deviceId }) => {
    const limitNum = Math.max(1, Number(limit) || 5);
    const pageNum = Math.max(1, Number(page) || 1);
    const skip = (pageNum - 1) * limitNum;
    const sortMap = {
        ctime: { _id: -1 },
        "-ctime": { _id: 1 },
        date_desc: { inspection_date: -1 },
        date_desc: { inspection_date: 1 }
    };
    const sortBy = sortMap[sort] || sortMap.ctime;
    const filter = {};
    if (!deviceId) throw new BadRequestError("Device is invalid");
    filter.device_id = deviceId;
    const frontDate = parseDate(from);
    const toDate = parseDate(to);
    if (toDate || frontDate) {
        const range = {};
        if (frontDate) range.$gte = frontDate;
        if (toDate) range.$lt = toDate;
        filter.inspection_date = range;
    }
    const [results, total] = await Promise.all([
        healthCheck.find(filter).sort(sortBy).skip(skip).limit(limitNum).lean().exec(),
        healthCheck.countDocuments({})
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limitNum));
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    return {
        results,
        pagination: {
            totalResult: total,
            page: pageNum,
            limit: limitNum,
            totalPages,
            hasNext,
            hasPrev
        }
    };
};

const findRecordById = async ({id}) => {
    return healthCheck.findById(id).lean();
} 
const deleteDataByDeviceId = async ({ deviceId }) => {
    const { deletedCount } = await healthCheck.deleteMany({ device_id: deviceId });
    return deletedCount;
};

module.exports = {
    insertPredictHealth,
    findAllCheckResults,
    deleteDataByDeviceId,
    findRecordById
};
