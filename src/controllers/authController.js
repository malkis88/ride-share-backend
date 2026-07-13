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
  isAdmin: user.isAdmin,
  profilePicture: user.profilePicture,
  licenseNumber: user.licenseNumber,
  licenseExpiry: user.licenseExpiry,
  yearsOfExperience: user.yearsOfExperience,
  vehicleType: user.vehicleType,
  vehiclePlate: user.vehiclePlate,
  vehicleColor: user.vehicleColor,
  documents: user.documents,
  verificationStatus: user.verificationStatus,
  verificationNote: user.verificationNote,
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
      documents,
    } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ message: 'First and last name are required' });
    }
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const trimmed = identifier.trim();
    const usingEmail = isEmail(trimmed);
    const query = usingEmail ? { email: trimmed.toLowerCase() } : { phone: trimmed };

    const existing = await User.findOne(query);
    if (existing) {
      return res.status(400).json({ message: 'An account with this identifier already exists' });
    }

    const finalRole = role || 'rider';

    if (finalRole === 'driver') {
      const requiredDocs = ['driversLicense', 'vehicleRegistration', 'insuranceCertificate', 'selfie'];
      const missing = requiredDocs.filter((key) => !documents || !documents[key]);
      if (missing.length > 0) {
        return res.status(400).json({ message: `Missing required documents: ${missing.join(', ')}` });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const userData = {
      firstName,
      lastName,
      password: hashed,
      role: finalRole,
      profilePicture: profilePicture || null,
      agreedToTerms: !!agreedToTerms,
      verificationStatus: finalRole === 'driver' ? 'pending' : 'not_applicable',
      ...(usingEmail ? { email: trimmed.toLowerCase() } : { phone: trimmed }),
    };

    if (finalRole === 'driver') {
      Object.assign(userData, {
        licenseNumber: licenseNumber || null,
        licenseExpiry: licenseExpiry || null,
        yearsOfExperience: yearsOfExperience || null,
        vehicleType: vehicleType || null,
        vehiclePlate: vehiclePlate || null,
        vehicleColor: vehicleColor || null,
        documents: {
          driversLicense: documents?.driversLicense || null,
          vehicleRegistration: documents?.vehicleRegistration || null,
          insuranceCertificate: documents?.insuranceCertificate || null,
          vehicleInspection: documents?.vehicleInspection || null,
          selfie: documents?.selfie || null,
        },
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
    const query = usingEmail ? { email: trimmed.toLowerCase() } : { phone: trimmed };

    const user = await User.findOne(query);
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    if (!user.password) {
      return res.status(400).json({ message: 'This account uses social sign-in. Please continue with Google or Apple.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: buildUserResponse(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};