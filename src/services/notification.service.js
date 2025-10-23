const { Types } = require('mongoose')
const notification = require('../models/notification.model');
const UserToken = require('../models/usertoken.model')
const { getIO } = require('../socket');
const { BadRequestError } = require('../core/error.response');
const { pushToken } = require('../fcm');
const toOid = (v) => (Types.ObjectId.isValid(String(v)) ? new Types.ObjectId(String(v)) : null);
async function createAndEmit({ userId, deviceId, title, body, data }) {
    const doc = await notification.create({
        device_id: deviceId, title, body, data
    })
    getIO().to(String(userId)).emit('notification:new', {
        _id: doc._id,
        title: doc.title,
        body: doc.body,
        createdAt: doc.createdAt,
        read: doc.read,
        data: doc.data
    })

    const tokens = await UserToken.find({ user_id: userId }).distinct('token');
    if (tokens.length) {
        const payload = {
            title,
            body,
            data: {
                notificationId: String(doc._id),
                ...(doc.data || {})
            }
        };
        const result = await pushToken(tokens, payload);

        const invalids = [];
        result.responses.forEach((r, i) => {
            if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
                invalids.push(tokens[i])
            }
        });

        if (invalids.length) {
            await UserToken.deleteMany({ token: { $in: invalids } });
        }
    }
    return doc;
}
async function getListNotification({page = 1, limit = 10, read = 'all', sort = 'ctime'}) {
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 10);
    const skip = (pageNum - 1) * limitNum
    const filter = {}
    if (read === 'true') filter.read = true;
    if (read === 'false') filter.read = false;
    const sortMap = { ctime: { createdAt: 1 }, '-ctime': { createdAt: -1 } };
    const sortBy = sortMap[sort] || sortMap['-ctime']
    const [items, total, unread] = await Promise.all([
        notification.find(filter).sort(sortBy).skip(skip).limit(limitNum).lean(),
        notification.countDocuments(filter),
        notification.countDocuments({ read: false })
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
        unread,
        results: items,
        pagination: {
            totalResult: total, pageNum, limitNum, totalPages,
            hasNext: pageNum < totalPages, hasPrev: pageNum > 1
        }
    }
}

async function markRead({ ids = [] }) {
    let filter = { read: false };
    if (ids.length) {
        const oidList = ids.map(toOid).filter(Boolean);
        if (!oidList.length) throw new BadRequestError("Invalid request !!!")
        filter._id = { $in: oidList }
    }
    const result = await notification.updateMany(filter, { $set: { read: true } });
    const unread = await notification.countDocuments({ read: false });

    return {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        unread
    }
}
async function deleteNotification({ id = '', option = 'one' }) {
    let result = null, unread = 0;
    if (toOid(id)) {
        if (option !== 'all') {
            result = await notification.deleteOne({ _id: toOid(id) }).lean();
            unread = await notification.countDocuments({ read: false });
        }
    } else {
        if (option === "all") {
            result = await notification.deleteMany({});
        }
    }
    if (!result) throw new BadRequestError("Invalid request !!!")
    return {
        deletedCount: result.deletedCount,
        unread
    }
}
module.exports = { createAndEmit, getListNotification, markRead, deleteNotification }