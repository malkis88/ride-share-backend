const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  phone: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['rider', 'driver'], default: 'rider' },
  profilePicture: { type: String, default: null },

  // driver-only fields
  licenseNumber: { type: String, default: null },
  licenseExpiry: { type: String, default: null },
  yearsOfExperience: { type: String, default: null },
  vehicleType: { type: String, default: null },
  vehiclePlate: { type: String, default: null },
  vehicleColor: { type: String, default: null },
  agreedToTerms: { type: Boolean, default: false },

  documents: {
    driversLicense: { type: String, default: null },
    vehicleRegistration: { type: String, default: null },
    insuranceCertificate: { type: String, default: null },
    vehicleInspection: { type: String, default: null },
    selfie: { type: String, default: null },
  },

  verificationStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'approved', 'rejected'],
    default: 'not_applicable',
  },
  verificationNote: { type: String, default: null },

  currentLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  isAvailable: { type: Boolean, default: false }
}, { timestamps: true });

userSchema.pre('validate', function (next) {
  if (!this.phone && !this.email) {
    return next(new Error('Either phone or email is required'));
  }
  next();
});

module.exports = mongoose.model('User', userSchema);