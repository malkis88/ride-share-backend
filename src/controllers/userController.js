const User = require('../models/User');

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      profilePicture: user.profilePicture,
      isAvailable: user.isAvailable,
      verificationStatus: user.verificationStatus,
      vehicleType: user.vehicleType,
      vehiclePlate: user.vehiclePlate,
      vehicleColor: user.vehicleColor,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { isAvailable, lat, lng } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role !== 'driver') {
      return res.status(403).json({ message: 'Only drivers can update availability' });
    }
    if (user.verificationStatus === 'pending' || user.verificationStatus === 'rejected') {
      return res.status(403).json({ message: 'Your driver account is not yet approved' });
    }

    user.isAvailable = !!isAvailable;
    if (typeof lat === 'number' && typeof lng === 'number') {
      user.currentLocation = { lat, lng };
    }
    await user.save();

    res.json({ isAvailable: user.isAvailable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updatePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ message: 'pushToken is required' });

    await User.findByIdAndUpdate(req.user.id, { pushToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};