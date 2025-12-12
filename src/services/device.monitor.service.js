const Redis = require("ioredis");
const nodemailer = require("nodemailer");
const Device = require("../models/device.model");
const createHttpError = require("http-errors");
const { getEmailTemplate } = require("../utils/email");
const { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, EMAIL_NAME, EMAIL_APP_PASS } = process.env;

const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD
});

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: EMAIL_NAME,
        pass: EMAIL_APP_PASS
    }
});

const THRESHOLD_OFFLINE_MS = 10000;

const sendAlertEmail = async (deviceId, status) => {
    const timeString = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    const subject = `[IoT Alert] Thiết bị ${deviceId} đang ${status}`;

    try {
        const device = await Device.findOne({ device_id: deviceId }).populate("owner");
        const owner = device.owner;

        if (!owner.email) throw createHttpError.BadRequest("Người dùng không có email");
        const htmlContent = getEmailTemplate(deviceId, status, timeString);

        await transporter.sendMail({
            from: "IoT System",
            to: owner.email,
            subject: subject,
            html: htmlContent
        });
        console.log(`Đã gửi mail cảnh báo ${status} cho ${deviceId}`);
    } catch (err) {
        console.error("Lỗi gửi mail:", err);
    }
};

module.exports = {
    handleHeartbeat: async (deviceId) => {
        const now = Date.now();
        const deviceKey = `device:${deviceId}`;

        const lastStatus = await redis.hget(deviceKey, "status");

        await redis.hset(deviceKey, "last_seen", now, "status", "online");
        await redis.sadd("active_devices", deviceId);

        if (lastStatus === "offline") await sendAlertEmail(deviceId, "ONLINE");
    },

    checkOfflineDevices: async () => {
        const now = Date.now();
        const deviceIds = await redis.smembers("active_devices");

        for (const deviceId of deviceIds) {
            const deviceKey = `device:${deviceId}`;
            const lastSeen = await redis.hget(deviceKey, "last_seen");
            const currentStatus = await redis.hget(deviceKey, "status");

            if (lastSeen) {
                const diff = now - parseInt(lastSeen);

                if (diff > THRESHOLD_OFFLINE_MS && currentStatus !== "offline") {
                    await redis.hset(deviceKey, "status", "offline");
                    await sendAlertEmail(deviceId, "OFFLINE");
                }
            }
        }
    }
};
