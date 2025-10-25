const { saveFcmToken } = require("../services/usertoken.service");
const { SuccessResponse } = require("../core/success.response");
module.exports = {
    saveFcmToken: async (req, res) => {
        const { userId, token, installationId, platform } = req.body;
        new SuccessResponse({
            message: "Save token",
            metadata: await saveFcmToken({ userId, token, installationId, platform })
        }).send(res);
    }
};
