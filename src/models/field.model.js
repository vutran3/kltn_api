const mongoose = require('mongoose')
const { Schema } = mongoose


const DOCUMENT_NAME = 'Field'
const COLLECTION_NAME = 'fields'

const locationSchema = new mongoose.Schema({
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    city: { type: String },
    country: { type: String }
}, {
    _id: false
})

const fieldSchema = new mongoose.Schema({
    field_id: { type: Schema.Types.ObjectId },
    name: { type: String, required: true },
    owner_id: { type: Schema.Types.ObjectId, required: true },
    establishedDate: { type: Date },
    description: { type: String },
    totalArea: { type: Number },
    fieldType: { type: String },
    isActive: { type: Boolean, default: true },
    location: locationSchema
}, {collection: COLLECTION_NAME})


module.exports = mongoose.model(DOCUMENT_NAME, fieldSchema)