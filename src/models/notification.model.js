const {Schema, Types, model} = require('mongoose')

const DOCUMENT_NAME = "Notification";
const COLLECTION_NAME = "notifications";

const notificationSchema = new Schema({
    device_id: {type: String, index: true, required: true},
    title: {type: String, required: true},
    body: {type: String, required: true},
    data: Schema.Types.Mixed,
    read: {type: Boolean, default: false}
}, {collection: COLLECTION_NAME, timestamps: true})

notificationSchema.index({device_id: 1, read: 1, createdAt: -1})

module.exports = model(DOCUMENT_NAME, notificationSchema)