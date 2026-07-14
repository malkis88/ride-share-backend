const mongoose = require('mongoose');

const rideSchema = new mongoose.Schema({
  rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  pickup: {
    address: String,
    lat: Number,
    lng: Number
  },
  dropoff: {
    address: String,
    lat: Number,
    lng: Number
  },
  distanceKm: { type: Number, default: null },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  cancelledBy: { type: String, enum: ['rider', 'driver', null], default: null },
  fareEstimate: { type: Number, default: 0 },
  driverRating: { type: Number, min: 1, max: 5, default: null },
  riderRating: { type: Number, min: 1, max: 5, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);