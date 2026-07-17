const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  seatsBooked: {
    type: Number,
    required: true,
  },


  status: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "rejected",
      "cancelled",
    ],
    default: "pending",
  },

  requestedAt: {
    type: Date,
    default: Date.now,
  },

  respondedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const tripSchema = new mongoose.Schema({
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  origin: {
    address: { type: String, required: true },
    lat: Number,
    lng: Number,
  },
  destination: {
    address: { type: String, required: true },
    lat: Number,
    lng: Number,
  },
  departureTime: { type: Date, required: true },
  pricePerKm: { type: Number, required: true },
  distanceKm: { type: Number, required: true },
  totalPricePerSeat: { type: Number, required: true },
  totalSeats: { type: Number, required: true },
  availableSeats: { type: Number, required: true },
  notes: { type: String, default: null },

  // Snapshot of the driver's vehicle at trip creation time, so riders see it without extra lookups
  vehicleType: String,
  vehiclePlate: String,
  vehicleColor: String,

  status: {
    type: String,
    enum: ['scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'scheduled',
  },

  startedAt: Date,

completedAt: Date,

driverLocation: {
    latitude: Number,
    longitude: Number,
    heading: Number,
    speed: Number,
    updatedAt: Date,
},
  passengers: [passengerSchema],
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);