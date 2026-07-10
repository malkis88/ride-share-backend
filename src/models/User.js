const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver'], default: 'rider' },
  vehicleModel: { type: String },
  vehiclePlate: { type: String },
  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  isAvailable: { type: Boolean, default: false }
}, { timestamps: true });

// require at least one of phone or email
userSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    return next(new Error('Either phone or email is required'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);