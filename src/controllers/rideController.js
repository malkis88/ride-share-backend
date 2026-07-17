const Ride = require('../models/Ride');
const User = require('../models/User');
const { sendPushNotifications } = require('../services/pushService');
const { getRouteDistance } = require('../services/mapsService');

const BASE_FARE = 1.5;
const PER_KM_RATE = 0.8;

exports.getFareConfig = async (req, res) => {
  res.json({ baseFare: BASE_FARE, perKmRate: PER_KM_RATE });
};

exports.requestRide = async (req, res) => {
  try {
    const { pickup, dropoff } = req.body;

    if (!pickup?.address || pickup?.lat == null || pickup?.lng == null) {
      return res.status(400).json({ message: 'Pickup location with coordinates is required' });
    }
    if (!dropoff?.address || dropoff?.lat == null || dropoff?.lng == null) {
      return res.status(400).json({ message: 'Dropoff location with coordinates is required' });
    }

    let routeInfo;
    try {
      routeInfo = await getRouteDistance(pickup.lat, pickup.lng, dropoff.lat, dropoff.lng);
    } catch (err) {
      console.error('Directions API error (ride):', err.message);
      return res.status(400).json({ message: 'Could not calculate route. Please check the locations and try again.' });
    }

    const fareEstimate = Math.round((BASE_FARE + routeInfo.distanceKm * PER_KM_RATE) * 100) / 100;

    const ride = await Ride.create({
      rider: req.user.id,
      pickup,
      dropoff,
      distanceKm: routeInfo.distanceKm,
      durationMin: routeInfo.durationMin,
      routePolyline: routeInfo.polyline,
      fareEstimate,
    });

    const io = req.app.get('io');
    io.to('drivers').emit('ride:new', {
      _id: ride._id,
      rider: ride.rider,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      distanceKm: ride.distanceKm,
      fareEstimate: ride.fareEstimate,
      status: ride.status,
      createdAt: ride.createdAt,
    });

    const availableDrivers = await User.find({
      role: 'driver',
      isAvailable: true,
      verificationStatus: 'approved',
      pushToken: { $ne: null },
    }).select('pushToken');

    if (availableDrivers.length > 0) {
      sendPushNotifications(
        availableDrivers.map((d) => d.pushToken),
        'New ride request',
        `Pickup at ${pickup.address}. Fare estimate: $${fareEstimate.toFixed(2)}.`,
        { screen: 'home', type: 'ride_requested', rideId: ride._id.toString() }
      );
    }

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate('rider', 'pushToken');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') return res.status(400).json({ message: 'Ride already taken' });

    ride.driver = req.user.id;
    ride.status = 'accepted';
    await ride.save();

    const driver = await User.findById(req.user.id);
    const populatedRide = await Ride.findById(ride._id)
      .populate('rider', 'firstName lastName profilePicture phone')
      .populate('driver', 'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor');

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('ride:update', populatedRide);
    io.to('drivers').emit('ride:taken', { rideId: ride._id });

    if (ride.rider?.pushToken) {
      sendPushNotifications(
        [ride.rider.pushToken],
        'Driver on the way!',
        `${driver.firstName} accepted your ride and is heading to pick you up.`,
        { screen: 'ride', type: 'ride_accepted', rideId: ride._id.toString() }
      );
    }

    res.json(populatedRide);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, driver: req.user.id }).populate('rider', 'pushToken');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'accepted') {
      return res.status(400).json({ message: 'Ride must be accepted before starting' });
    }

    ride.status = 'in_progress';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate('rider', 'firstName lastName profilePicture phone')
      .populate('driver', 'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor');

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('ride:update', populatedRide);

    if (ride.rider?.pushToken) {
      sendPushNotifications([ride.rider.pushToken], 'Trip started', 'Your trip is now in progress.', {
        screen: 'ride',
        type: 'ride_started',
        rideId: ride._id.toString(),
      });
    }

    res.json(populatedRide);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findOne({ _id: req.params.id, driver: req.user.id }).populate('rider', 'pushToken');
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'in_progress') {
      return res.status(400).json({ message: 'Ride must be in progress to complete' });
    }

    ride.status = 'completed';
    await ride.save();

    const populatedRide = await Ride.findById(ride._id)
      .populate('rider', 'firstName lastName profilePicture phone')
      .populate('driver', 'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor');

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('ride:update', populatedRide);

    if (ride.rider?.pushToken) {
      sendPushNotifications([ride.rider.pushToken], 'Trip completed', 'You have arrived. Please rate your driver.', {
        screen: 'ride',
        type: 'ride_completed',
        rideId: ride._id.toString(),
      });
    }

    res.json(populatedRide);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('rider', 'pushToken')
      .populate('driver', 'pushToken firstName');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isRider = ride.rider._id.toString() === req.user.id;
    const isDriver = ride.driver && ride.driver._id.toString() === req.user.id;

    if (!isRider && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to cancel this ride' });
    }
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ message: 'This ride can no longer be cancelled' });
    }

    ride.status = 'cancelled';
    ride.cancelledBy = isRider ? 'rider' : 'driver';
    await ride.save();

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit('ride:update', ride);
    io.to('drivers').emit('ride:cancelled', { rideId: ride._id });

    if (isRider && ride.driver?.pushToken) {
      sendPushNotifications([ride.driver.pushToken], 'Ride cancelled', 'The rider cancelled this ride.', {
        screen: 'home',
        type: 'ride_cancelled',
      });
    }
    if (isDriver && ride.rider?.pushToken) {
      sendPushNotifications([ride.rider.pushToken], 'Ride cancelled', 'The driver cancelled this ride.', {
        screen: 'home',
        type: 'ride_cancelled',
      });
    }

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.rateRide = async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'completed') {
      return res.status(400).json({ message: 'You can only rate completed rides' });
    }

    if (req.user.role === 'rider') {
      ride.driverRating = rating;
    } else {
      ride.riderRating = rating;
    }
    await ride.save();

    res.json({ driverRating: ride.driverRating, riderRating: ride.riderRating });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate('rider', 'firstName lastName profilePicture phone')
      .populate('driver', 'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor');

    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    const isRider = ride.rider._id.toString() === req.user.id;
    const isDriver = ride.driver && ride.driver._id.toString() === req.user.id;
    if (!isRider && !isDriver) {
      return res.status(403).json({ message: 'Not authorized to view this ride' });
    }

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const filter = req.user.role === 'rider' ? { rider: req.user.id } : { driver: req.user.id };

    const rides = await Ride.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('rider', 'firstName lastName profilePicture phone')
      .populate('driver', 'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailableRides = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can view available rides' });
    }

    const rides = await Ride.find({ status: 'requested' })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('rider', 'firstName lastName profilePicture phone');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};