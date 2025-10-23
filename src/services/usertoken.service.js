const UserToken = require('../models/usertoken.model');
const { BadRequestError } = require('../core/error.response')

const MAX_TOKENS_PER_USER_PER_PLATFORM = 5;
const STALE_DAYS = 90;

exports.saveFcmToken = async ({ userId, token, installationId = null, platform = null }) => {
    if (!token) throw new BadRequestError("Token is required !!!")
    const now = new Date();
    const upsertRes = await UserToken.updateOne(
        { token },
        {
            $set: {
                user_id: userId,
                installation_id: installationId,
                platform: platform ?? null,
                last_seen_at: now
            }
        },
        { upsert: true }
    );

    let pruned = 0;
    if (installationId) {
        const delRes = await UserToken.deleteMany({
            user_id: userId,
            installation_id: installationId,
            token: { $ne: token }
        });
        pruned = delRes.deletedCount || 0
    } else {
        const staleSince = new Date(now.getTime() - STALE_DAYS * 86400 * 1000);
        await UserToken.deleteMany({
            user_id: userId,
            platform,
            last_seen_at: { $lt: staleSince }

        });
        const keep = await UserToken.find({user_id: userId, platform})
        .sort({last_seen_at: -1})
        .select({_id: 1})
        .lean();

        if(keep.length > MAX_TOKENS_PER_USER_PER_PLATFORM){
            const idsToRemove = keep.slice(MAX_TOKENS_PER_USER_PER_PLATFORM).map(d => d._id);
            await UserToken.deleteMany({_id: {$in: idsToRemove}});
        }
    }
    return {
        ok: true,
        upserted: upsertRes.upsertedCount || 0,
        prunedOldTokensInSameInstallation: pruned
    }
}