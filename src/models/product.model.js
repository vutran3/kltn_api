const mongoose = require('mongoose');

const DOCUMENT_NAME = 'Product'
const COLLECTION_NAME = 'products'

const productSchema = new mongoose.Schema({
  product_id: { type: mongoose.Schema.Types.ObjectId },
  field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Field', required: true },
  name: { type: String, required: true },
  type: { type: String },
  plantingDate: { type: Date },
  expectedHarvestDate: { type: Date },
  actualHarvestDate: { type: Date },
  pricePerUnit: { type: Number },
  status: { type: String },
  images: [{ type: String }],
}, { collection: COLLECTION_NAME });

module.exports = mongoose.model(DOCUMENT_NAME, productSchema);
