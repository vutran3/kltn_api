const admin = require('firebase-admin')
const serviceAccount = require('../../certs/firebase-service-account.json');
const { BadRequestError } = require('../core/error.response');
const UserToken = require('../models/usertoken.model')
let initialized = false;

function initFCM() {
    if (initialized) return;
    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    initialized = true;
}
/**
 * tokens: string[] (<= 500 phần tử cho mỗi lần gọi)
 * opts: {
 *   title: string,
 *   body: string,
 *   data?: Record<string, string|number|boolean>,
 *   channelId?: string,            // mặc định 'high-priority' (khớp app)
 *   androidPriority?: 'normal'|'high',
 *   ttlSeconds?: number,           // ví dụ 3600
 *   imageUrl?: string,             // ảnh lớn (tuỳ)
 *   sound?: string                 // 'default' (iOS/Android)
 * }
 */
async function pushToken(tokens, opts) {
    initFCM();
    const {
        title,
        body,
        data = {},
        channelId = 'high-priority',
        androidPriority = 'high',
        ttlSeconds = 3600,
        sound = 'default',
    } = opts || {};

    if (!tokens || tokens.length === 0) {
        return { successCount: 0, failureCount: 0, responses: [] };
    }

    if (tokens.length > 500) throw BadRequestError('FCM multicast chỉ hỗ trợ tối đa 500 tokens/lần gửi')

    const safeData = Object.fromEntries(
        Object.entries({ ...data, title, body }).map(([k, v]) => [k, String(v)])
    );

    const res = await admin.messaging().sendEachForMulticast({
        tokens,
        data: safeData,
        android: {
            priority: androidPriority,
            ttl: ttlSeconds * 1000,
            notification: {
                channelId: channelId,
                sound
            }
        }
    })
    const toRemove = [];
    res.responses.forEach((r, idx) => {
        if (!r.success) {
            const code = r?.error?.code || '';
            if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
                toRemove.push(tokens[i])
            }
        }
    });
    let removed = 0;
    if(toRemove.length) {
        const delRes = await UserToken.deleteMany({token: {$in: toRemove}})
        removed = delRes.deletedCount || 0;
    }
    return { successCount: res.successCount, failureCount: res.failureCount, responses: res.responses, removed }
}

module.exports = { pushToken }