const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isEmail = (value) => /\S+@\S+\.\S+/.test(value);

const buildUserResponse = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profilePicture: user.profilePicture,
  licenseNumber: user.licenseNumber,
  licenseExpiry: user.licenseExpiry,
  yearsOfExperience: user.yearsOfExperience,
  vehicleType: user.vehicleType,
  vehiclePlate: user.vehiclePlate,
  vehicleColor: user.vehicleColor,
});

exports.register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      identifier,
      password,
      role,
      profilePicture,
      licenseNumber,
      licenseExpiry,
      yearsOfExperience,
      vehicleType,
      vehiclePlate,
      vehicleColor,
      agreedToTerms,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First and last name are required' });
    }
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const trimmed = identifier.trim();
    const usingEmail = isEmail(trimmed);

    const query = usingEmail
      ? { email: trimmed.toLowerCase() }
      : { phone: trimmed };

    const existing = await User.findOne(query);
    if (existing) {
      return res.status(400).json({ message: 'An account with this identifier already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      firstName,
      lastName,
      password: hashed,
      role: role || 'rider',
      profilePicture: profilePicture || null,
      agreedToTerms: !!agreedToTerms,
      ...(usingEmail ? { email: trimmed.toLowerCase() } : { phone: trimmed }),
    };

    if ((role || 'rider') === 'driver') {
      Object.assign(userData, {
        licenseNumber: licenseNumber || null,
        licenseExpiry: licenseExpiry || null,
        yearsOfExperience: yearsOfExperience || null,
        vehicleType: vehicleType || null,
        vehiclePlate: vehiclePlate || null,
        vehicleColor: vehicleColor || null,
      });
    }

    const user = await User.create(userData);

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: buildUserResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const trimmed = identifier.trim();
    const usingEmail = isEmail(trimmed);

    const query = usingEmail
      ? { email: trimmed.toLowerCase() }
      : { phone: trimmed };

    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildUserResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};