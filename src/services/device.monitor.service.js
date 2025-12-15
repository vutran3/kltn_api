const redis = require("../databases/redis.database");
const Device = require("../models/device.model");
const { sendAlertEmail } = require("../utils/email");

const THRESHOLD_OFFLINE_MS = 10000;

module.exports = {
    handleHeartbeat: async (deviceId) => {
        const now = Date.now();
        const deviceKey = `device:${deviceId}`;

        const lastStatus = await redis.hget(deviceKey, "status");

        await redis.hset(deviceKey, "last_seen", now, "status", "online");
        await redis.sadd("active_devices", deviceId);

        if (lastStatus === "offline") {
            await Promise.all([
                sendAlertEmail(deviceId, "ONLINE"),
                Device.findOneAndUpdate(
                    {
                        device_id: deviceId
                    },
                    {
                        is_active: true
                    }
                )
            ]);
        }
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
                    await Promise.all([
                        redis.hset(deviceKey, "status", "offline"),
                        redis.hset(deviceKey, "status", "offline"),
                        sendAlertEmail(deviceId, "OFFLINE"),
                        Device.findOneAndUpdate(
                            {
                                device_id: deviceId
                            },
                            {
                                is_active: false
                            }
                        )
                    ]);
                }
            }
        }
    }
};
