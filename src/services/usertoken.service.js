const UserToken = require('../models/usertoken.model');
const { BadRequestError } = require('../core/error.response')
exports.saveFcmToken = async ({ userId, token }) => {

    if (!token) throw new BadRequestError("Token is required !!!")
    await UserToken.updateOne(
        { token },
        {$set: {user_id: userId}},
        {upsert: true}
    );
    return {ok: true}
}