const Trip = require('../models/Trip');
const User = require('../models/User');

exports.createTrip = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id);
    if (!driver || driver.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can create trips' });
    }
    if (driver.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Your driver account must be approved before creating trips' });
    }

    const { origin, destination, departureTime, pricePerKm, distanceKm, availableSeats, notes } = req.body;

    if (!origin?.address || !destination?.address) {
      return res.status(400).json({ message: 'Origin and destination addresses are required' });
    }
    if (!departureTime) {
      return res.status(400).json({ message: 'Departure time is required' });
    }
    if (!pricePerKm || pricePerKm <= 0) {
      return res.status(400).json({ message: 'Price per km must be greater than 0' });
    }
    if (!distanceKm || distanceKm <= 0) {
      return res.status(400).json({ message: 'Distance must be greater than 0' });
    }
    if (!availableSeats || availableSeats < 1) {
      return res.status(400).json({ message: 'Available seats must be at least 1' });
    }

    const totalPricePerSeat = Math.round(pricePerKm * distanceKm * 100) / 100;

    const trip = await Trip.create({
      driver: driver._id,
      origin,
      destination,
      departureTime: new Date(departureTime),
      pricePerKm,
      distanceKm,
      totalPricePerSeat,
      totalSeats: availableSeats,
      availableSeats,
      notes: notes || null,
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehiclePlate,
      vehicleColor: driver.vehicleColor,
    });

    res.status(201).json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailableTrips = async (req, res) => {
  try {
    const trips = await Trip.find({
      status: 'scheduled',
      availableSeats: { $gt: 0 },
      departureTime: { $gte: new Date(Date.now() - 1000 * 60 * 60) },
    })
      .sort({ departureTime: 1 })
      .limit(50)
      .populate('driver', 'firstName lastName profilePicture');

    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const trips = await Trip.find({ driver: req.user.id })
      .sort({ departureTime: -1 })
      .populate('passengers.rider', 'firstName lastName profilePicture');
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status === 'completed') {
      return res.status(400).json({ message: 'Cannot cancel a completed trip' });
    }
    trip.status = 'cancelled';
    await trip.save();
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.bookTrip = async (req, res) => {
  try {
    const seatsRequested = Number(req.body.seats) || 1;

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'scheduled') {
      return res.status(400).json({ message: 'This trip is no longer available' });
    }
    if (trip.availableSeats < seatsRequested) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

    trip.passengers.push({ rider: req.user.id, seatsBooked: seatsRequested, status: 'confirmed' });
    trip.availableSeats -= seatsRequested;
    await trip.save();

    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const trips = await Trip.find({ 'passengers.rider': req.user.id })
      .sort({ departureTime: -1 })
      .populate('driver', 'firstName lastName profilePicture vehicleType vehiclePlate vehicleColor');
    res.json(trips);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};