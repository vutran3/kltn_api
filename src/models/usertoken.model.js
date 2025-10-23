const { Schema, model, Types } = require('mongoose');

const userTokenSchema = new Schema({
  user_id: { type: String, required: true },
  token:   { type: String, index: true, unique: true },
}, { timestamps: true, collection: 'usertokens' });

module.exports = model('UserToken', userTokenSchema);