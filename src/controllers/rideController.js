const Ride = require('../models/Ride');

exports.requestRide = async (req, res) => {
  try {
    const { pickup, dropoff, fareEstimate } = req.body;
    const ride = await Ride.create({
      rider: req.user.id,
      pickup,
      dropoff,
      fareEstimate,
    });

    const io = req.app.get('io');
    io.emit('ride:new', ride);

    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.acceptRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });
    if (ride.status !== 'requested') return res.status(400).json({ message: 'Ride already taken' });

    ride.driver = req.user.id;
    ride.status = 'accepted';
    await ride.save();

    const io = req.app.get('io');
    io.emit(`ride:update:${ride._id}`, ride);
    io.emit('ride:taken', ride._id);

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: 'Ride not found' });

    ride.status = status;
    await ride.save();

    const io = req.app.get('io');
    io.emit(`ride:update:${ride._id}`, ride);

    res.json(ride);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyRides = async (req, res) => {
  try {
    const filter = req.user.role === 'rider'
      ? { rider: req.user.id }
      : { driver: req.user.id };

    const rides = await Ride.find(filter)
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('rider', 'firstName lastName profilePicture')
      .populate('driver', 'firstName lastName profilePicture vehicleType vehiclePlate vehicleColor');

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
      .populate('rider', 'firstName lastName profilePicture');

    res.json(rides);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};