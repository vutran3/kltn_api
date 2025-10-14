const deviceSchema = new Schema({
  device_id: { type: String, required: true, index: true, unique: true },
  device_name: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  apiKey: String,

  lastStatus: {
    on: Boolean,
    hasSchedule: Boolean,
    now: Number,
    schedStart: Number,
    schedEnd: Number,
  },
  lastSeenAt: { type: Date },

  commandQueue: [{
    cmd: { type: String, enum: ['on','off','on_for','schedule','cancel'], required: true },
    minutes: Number, 
    at: Number,           
    enqueuedAt: { type: Date, default: Date.now },
    consumedAt: Date,
  }]
}, { timestamps: true, collection: 'devices' });
