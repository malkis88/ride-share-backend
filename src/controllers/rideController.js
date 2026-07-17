const Ride = require('../models/Ride');
const User = require('../models/User');
const { sendPushNotifications } = require('../services/pushService');



exports.requestRide = async (req, res) => {
  try {
    const { pickup, dropoff, fareEstimate } = req.body;

    const ride = await Ride.create({
      rider: req.user.id,
      pickup,
      dropoff,
      fareEstimate,
    });

  const io = req.app.get("io");

// Send the ride only to connected drivers
io.to("drivers").emit("ride:new", {
  _id: ride._id,
  rider: ride.rider,
  pickup: ride.pickup,
  dropoff: ride.dropoff,
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
        `Pickup at ${pickup?.address || 'a nearby location'}.`,
        {
          screen: 'home',
          type: 'ride_requested',
          rideId: ride._id.toString(),
        }
      );
    }

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate(
      'rider',
      'pushToken'
    );

    if (!ride)
      return res.status(404).json({ message: 'Ride not found' });

    if (ride.status !== 'requested')
      return res.status(400).json({ message: 'Ride already taken' });

    ride.driver = req.user.id;
    ride.status = 'accepted';

    await ride.save();

    const driver = await User.findById(req.user.id);

 const io = req.app.get("io");

// Notify rider and driver watching this ride
io.to(`ride:${ride._id}`).emit("ride:update", ride);

// Remove this request from every driver's request list
io.to("drivers").emit("ride:taken", {
  rideId: ride._id,
});

    if (ride.rider?.pushToken) {
      sendPushNotifications(
        [ride.rider.pushToken],
        'Driver on the way!',
        `${driver.firstName} accepted your ride and is heading to pick you up.`,
        {
          screen: 'home',
          type: 'ride_accepted',
          rideId: ride._id.toString(),
        }
      );
    }

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .populate(
        'rider',
        'firstName lastName profilePicture phone'
      )
      .populate(
        'driver',
        'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor'
      );

    if (!ride)
      return res.status(404).json({ message: 'Ride not found' });

    const userId = req.user.id;

    const isRider =
      ride.rider &&
      ride.rider._id.toString() === userId;

    const isDriver =
      ride.driver &&
      ride.driver._id.toString() === userId;

    if (!isRider && !isDriver) {
      return res.status(403).json({
        message: 'Not authorized to view this ride',
      });
    }

    res.json(ride);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.cancelRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        message: 'Ride not found',
      });

    if (ride.status === 'completed')
      return res.status(400).json({
        message: 'Completed rides cannot be cancelled',
      });

    ride.status = 'cancelled';

    ride.cancelledBy =
      req.user.role === 'driver'
        ? 'driver'
        : 'rider';

    await ride.save();

const io = req.app.get("io");

io.to(`ride:${ride._id}`).emit("ride:update", ride);

io.to("drivers").emit("ride:cancelled", {
  rideId: ride._id,
});

    res.json(ride);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.startRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        message: 'Ride not found',
      });

    ride.status = 'in_progress';

    await ride.save();

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit("ride:update", ride);

    res.json(ride);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.completeRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        message: 'Ride not found',
      });

    ride.status = 'completed';

    await ride.save();

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit("ride:update", ride);

    res.json(ride);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.rateRide = async (req, res) => {
  try {
    const { rating } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5',
      });
    }

    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        message: 'Ride not found',
      });

    if (req.user.role === 'rider') {
      ride.driverRating = rating;
    } else {
      ride.riderRating = rating;
    }

    await ride.save();

    res.json({
      message: 'Rating submitted successfully',
      ride,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const ride = await Ride.findById(req.params.id);

    if (!ride)
      return res.status(404).json({
        message: 'Ride not found',
      });

    ride.status = status;

    await ride.save();

    const io = req.app.get('io');
    io.to(`ride:${ride._id}`).emit("ride:update", ride);

    res.json(ride);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const filter =
      req.user.role === 'rider'
        ? { rider: req.user.id }
        : { driver: req.user.id };

    const rides = await Ride.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate(
        'rider',
        'firstName lastName profilePicture phone'
      )
      .populate(
        'driver',
        'firstName lastName profilePicture phone vehicleType vehiclePlate vehicleColor'
      );

    res.json(rides);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.getAvailableRides = async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        message: 'Only drivers can view available rides',
      });
    }

    const rides = await Ride.find({
      status: 'requested',
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate(
        'rider',
        'firstName lastName profilePicture phone'
      );

    res.json(rides);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};