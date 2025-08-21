const healthCheck = require('../healthcheck.model')


const insertPredictHealth = async (payload) => {
    const {
        deviceId,
        weekStartAt,
        image_predetect,
        ai_description,
        ai_prediction
    } = payload
    return await healthCheck.findOneAndUpdate({ device_id: deviceId, inspection_date: weekStartAt },
        {
            device_id: deviceId,
            inspection_date: weekStartAt,
            predicting_description: ai_description,
            image_predetect: image_predetect,
            ai_prediction
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )

}

const findAllCheckResults = async ({ limit, page, sort }) => {
    const limitNum = Math.max(1, Number(limit) || 5)
    const pageNum = Math.max(1, Number(page) || 1)
    const skip = (pageNum - 1) * limitNum
    const sortBy = sort === 'ctime' ? { _id: -1 } : { _id: 1 }
    const [results, total] = await Promise.all([healthCheck.find({})
        .sort(sortBy)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
    healthCheck.countDocuments({})
    ])
    const totalPages = Math.max(1, Math.ceil(total/limitNum))
    const hasNext = pageNum < totalPages
    const hasPrev = pageNum > 1
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
    }
}

module.exports = {
    insertPredictHealth,
    findAllCheckResults
}
