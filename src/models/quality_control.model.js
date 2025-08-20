const mongoose = require('mongoose');

const DOCUMENT_NAME = 'QualityControl'
const COLLECTION_NAME = 'quality_controls'

const qualityControlSchema = new mongoose.Schema({
  qc_id: { type: mongoose.Schema.Types.ObjectId },
  product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  inspection_date: { type: Date, required: true },
  predicting_description: { type: String },
  image_predetect: { type: String },
  image_detected: {type: String}
}, { collection: COLLECTION_NAME  });

module.exports = mongoose.model(DOCUMENT_NAME, qualityControlSchema);
