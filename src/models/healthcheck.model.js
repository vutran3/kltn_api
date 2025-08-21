const mongoose = require('mongoose');
const {Schema} = mongoose
const DOCUMENT_NAME = 'HealthCheck'
const COLLECTION_NAME = 'healthchecks'

const healthCheckSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  device_id: {type: String, required: true},
  inspection_date: { type: Date, required: true },
  predicting_description: { type: String },
  image_predetect: {
    image_url: {type: String, required: true},
    public_id: {type: String, requried: true}
  },
  ai_prediction: {type: Schema.Types.Mixed, required: true }
}, { collection: COLLECTION_NAME });

module.exports = mongoose.model(DOCUMENT_NAME, healthCheckSchema);
