const Reading = require("../models/reading.model");

module.exports = {
    async createSensorData(doc) {
        try {
            const data = await Reading.create(doc);
            return data;
        } catch (error) {
            throw error;
        }
    },

    async getSensorData({ deviceId, limit, sort }) {
        try {
            const readingData = await Reading.find({ deviceId: String(deviceId) })
                .sort({ ts: sort })
                .limit(limit)
                .lean();

            return readingData;
        } catch (error) {
            throw error;
        }
    },

    async getLatestSensorData({ deviceId, sort }) {
        try {
            const latestReadingData = await Reading.findOne({ deviceId: String(deviceId) })
                .sort({ ts: sort })
                .lean();
            return latestReadingData;
        } catch (error) {
            throw error;
        }
    }
};
