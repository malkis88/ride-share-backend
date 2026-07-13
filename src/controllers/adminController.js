const User = require('../models/User');

exports.getDriverApplications = async (req, res) => {
  try {
    const { status } = req.query; // optional filter: pending | approved | rejected
    const filter = { role: 'driver' };
    if (status) filter.verificationStatus = status;

    const drivers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(drivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDriverById = async (req, res) => {
  try {
    const driver = await User.findOne({ _id: req.params.id, role: 'driver' }).select('-password');
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.reviewDriver = async (req, res) => {
  try {
    const { decision, note } = req.body; // decision: "approved" | "rejected"

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be "approved" or "rejected"' });
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'driver' });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });

    driver.verificationStatus = decision;
    driver.verificationNote = note || null;
    await driver.save();

    res.json({
      id: driver._id,
      verificationStatus: driver.verificationStatus,
      verificationNote: driver.verificationNote,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};