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
  status: {
    type: String,
    enum: ['requested', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'requested'
  },
  fareEstimate: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);