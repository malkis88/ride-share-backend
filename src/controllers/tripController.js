const Trip = require('../models/Trip');
const User = require('../models/User');
const { getRouteDistance } = require('../services/mapsService');

exports.createTrip = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id);
    if (!driver || driver.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can create trips' });
    }
    if (driver.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Your driver account must be approved before creating trips' });
    }

    const { origin, destination, departureTime, pricePerKm, availableSeats, notes } = req.body;

    if (!origin?.address || origin?.lat == null || origin?.lng == null) {
      return res.status(400).json({ message: 'Origin location with coordinates is required' });
    }
    if (!destination?.address || destination?.lat == null || destination?.lng == null) {
      return res.status(400).json({ message: 'Destination location with coordinates is required' });
    }
    if (!departureTime) {
      return res.status(400).json({ message: 'Departure time is required' });
    }
    if (!pricePerKm || pricePerKm <= 0) {
      return res.status(400).json({ message: 'Price per km must be greater than 0' });
    }
    if (!availableSeats || availableSeats < 1) {
      return res.status(400).json({ message: 'Available seats must be at least 1' });
    }

    let routeInfo;
    try {
      routeInfo = await getRouteDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    } catch (err) {
      console.error('Directions API error (trip):', err.message);
      return res.status(400).json({ message: 'Could not calculate route distance. Please check the locations.' });
    }

    const totalPricePerSeat = Math.round(pricePerKm * routeInfo.distanceKm * 100) / 100;

    const trip = await Trip.create({
      driver: driver._id,
      origin,
      destination,
      departureTime: new Date(departureTime),
      pricePerKm,
      distanceKm: routeInfo.distanceKm,
      totalPricePerSeat,
      totalSeats: availableSeats,
      availableSeats,
      notes: notes || null,
      vehicleType: driver.vehicleType,
      vehiclePlate: driver.vehiclePlate,
      vehicleColor: driver.vehicleColor,
    });

    const io = req.app.get('io');
io.emit("trip:created", trip);

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
const trips = await Trip.find({ driver: req.user.id, isDeleted: { $ne: true } })
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

    // cancelTrip — after trip.save()
const io = req.app.get('io');
io.emit("trip:cancelled", trip);
io.to(`trip:${trip._id}`).emit("trip:updated", trip);
    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.startTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      driver: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    if (trip.status !== "scheduled") {
      return res.status(400).json({
        message: "Trip cannot be started",
      });
    }

    trip.status = "ongoing";
    trip.startedAt = new Date();

    await trip.save();

    const io = req.app.get("io");

    // startTrip — replace the emit line
io.to(`trip:${trip._id}`).emit("trip:updated", trip);
io.to(`user:${trip.driver}`).emit("trip:updated", trip);

    res.json(trip);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.completeTrip = async (req, res) => {
  try {

    const trip = await Trip.findOne({
      _id: req.params.id,
      driver: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    trip.status = "completed";
    trip.completedAt = new Date();

    await trip.save();

    const io = req.app.get("io");

// completeTrip — replace the emit lines
io.to(`trip:${trip._id}`).emit("trip:updated", trip);
io.to(`user:${trip.driver}`).emit("trip:updated", trip);
    

    res.json(trip);

  } catch (err) {

    res.status(500).json({
      message: err.message,
    });

  }
};

exports.updateDriverLocation = async (req, res) => {

  try {

    const {
      latitude,
      longitude,
      heading,
      speed,
    } = req.body;

    const trip = await Trip.findOne({
      _id: req.params.id,
      driver: req.user.id,
    });

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    trip.driverLocation = {
      latitude,
      longitude,
      heading,
      speed,
      updatedAt: new Date(),
    };

    await trip.save();

    const io = req.app.get("io");

    io.to(`trip:${trip._id}`).emit(
      "driver:tripLocation",
      {
        tripId: trip._id,
        latitude,
        longitude,
        heading,
        speed,
      }
    );

    res.json({
      success: true,
    });

  } catch (err) {

    res.status(500).json({
      message: err.message,
    });

  }

};


exports.bookTrip = async (req, res) => {
  try {
    const { sendPushNotifications } = require('../services/pushService');
    const seatsRequested = Number(req.body.seats) || 1;

    const trip = await Trip.findById(req.params.id).populate('driver', 'pushToken firstName');
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'scheduled') {
      return res.status(400).json({ message: 'This trip is no longer available' });
    }
    if (trip.availableSeats < seatsRequested) {
      return res.status(400).json({ message: 'Not enough seats available' });
    }

   trip.passengers.push({
  rider: req.user.id,
  seatsBooked: seatsRequested,
  status: "pending",
});

await trip.save();

const io = req.app.get("io");

// bookTrip — rename the event
io.to(`user:${trip.driver._id}`).emit("trip:updated", trip);
io.to(`user:${trip.driver._id}`).emit("trip:booking:requested", { tripId: trip._id });


    const rider = await User.findById(req.user.id);

    if (trip.driver?.pushToken) {
      sendPushNotifications(
        [trip.driver.pushToken],
        'New booking!',
        `${rider.firstName} booked ${seatsRequested} seat${seatsRequested > 1 ? 's' : ''} on your trip to ${trip.destination.address}.`,
        { screen: 'home', type: 'trip_booked', tripId: trip._id.toString() }
      );
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptBooking = async (req, res) => {
  try {
    const { id, bookingId } = req.params;

    const trip = await Trip.findOne({
      _id: id,
      driver: req.user.id,
    });

    if (!trip)
      return res.status(404).json({
        message: "Trip not found",
      });

    const booking = trip.passengers.id(bookingId);

    if (!booking)
      return res.status(404).json({
        message: "Booking not found",
      });

    if (booking.status !== "pending")
      return res.status(400).json({
        message: "Booking already processed",
      });

    if (trip.availableSeats < booking.seatsBooked)
      return res.status(400).json({
        message: "No seats available",
      });

    booking.status = "confirmed";
    booking.respondedAt = new Date();

    trip.availableSeats -= booking.seatsBooked;

    await trip.save();

   // acceptBooking — after trip.save()
const io = req.app.get("io");
io.to(`user:${booking.rider}`).emit("trip:booking:accepted", { tripId: trip._id });
io.to(`user:${booking.rider}`).emit("trip:updated", trip);
io.to(`user:${trip.driver}`).emit("trip:updated", trip);
io.to(`trip:${trip._id}`).emit("trip:updated", trip);

    res.json(trip);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.rejectBooking = async (req, res) => {
  try {

    const { id, bookingId } = req.params;

    const trip = await Trip.findOne({
      _id: id,
      driver: req.user.id,
    });

    if (!trip)
      return res.status(404).json({
        message: "Trip not found",
      });

    const booking = trip.passengers.id(bookingId);

    if (!booking)
      return res.status(404).json({
        message: "Booking not found",
      });

    booking.status = "rejected";
    booking.respondedAt = new Date();

    await trip.save();

 // rejectBooking — after trip.save()
const io = req.app.get("io");
io.to(`user:${booking.rider}`).emit("trip:booking:rejected", { tripId: trip._id });
io.to(`user:${booking.rider}`).emit("trip:updated", trip);
io.to(`user:${trip.driver}`).emit("trip:updated", trip);
io.to(`trip:${trip._id}`).emit("trip:updated", trip);

    res.json(trip);

  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate(
        "driver",
        "firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor"
      )
      .populate(
        "passengers.rider",
        "firstName lastName profilePicture phone"
      );

    if (!trip) {
      return res.status(404).json({
        message: "Trip not found",
      });
    }

    res.json(trip);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, driver: req.user.id });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (!['cancelled', 'completed'].includes(trip.status)) {
      return res.status(400).json({ message: 'Only cancelled or completed trips can be removed' });
    }
    trip.isDeleted = true;
    await trip.save();
    res.json({ message: 'Trip removed' });
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