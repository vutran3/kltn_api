const { Schema, model, Types } = require('mongoose');

const userTokenSchema = new Schema({
  user_id: { type: String, required: true },
  installation_id: {type: String, require: true},
  platform: {type: String},
  last_seen_at: {type: Date},
  token:   { type: String, index: true, unique: true },
}, { timestamps: true, collection: 'usertokens' });

userTokenSchema.index({user_id: 1, installation_id: 1});
userTokenSchema.index({user_id: 1, platform: 1});
userTokenSchema.index({ last_seen_at: 1 });
module.exports = model('UserToken', userTokenSchema); 