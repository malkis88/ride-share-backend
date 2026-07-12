const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const appleSignin = require('apple-signin-auth');
const User = require('../models/User');

const googleClient = new OAuth2Client();

const issueToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

const buildUserResponse = (user) => ({
  id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  name: `${user.firstName} ${user.lastName}`,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profilePicture: user.profilePicture,
  verificationStatus: user.verificationStatus,
});

exports.googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Missing Google ID token' });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: [
        process.env.GOOGLE_CLIENT_ID_WEB,
        process.env.GOOGLE_CLIENT_ID_IOS,
        process.env.GOOGLE_CLIENT_ID_ANDROID,
      ].filter(Boolean),
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, given_name, family_name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email: email?.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        email: email?.toLowerCase(),
        googleId,
        profilePicture: picture || null,
        role: 'rider',
        agreedToTerms: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = issueToken(user);
    res.json({ token, user: buildUserResponse(user) });
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(401).json({ message: 'Google sign-in failed. Please try again.' });
  }
};

exports.appleAuth = async (req, res) => {
  try {
    const { identityToken, firstName, lastName, email } = req.body;
    if (!identityToken) return res.status(400).json({ message: 'Missing Apple identity token' });

    const appleResponse = await appleSignin.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID,
      ignoreExpiration: false,
    });

    const appleId = appleResponse.sub;
    const appleEmail = appleResponse.email || email;

    let user = await User.findOne({ $or: [{ appleId }, { email: appleEmail?.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        firstName: firstName || 'Apple',
        lastName: lastName || 'User',
        email: appleEmail?.toLowerCase(),
        appleId,
        role: 'rider',
        agreedToTerms: true,
      });
    } else if (!user.appleId) {
      user.appleId = appleId;
      await user.save();
    }

    const token = issueToken(user);
    res.json({ token, user: buildUserResponse(user) });
  } catch (err) {
    console.error('Apple auth error:', err.message);
    res.status(401).json({ message: 'Apple sign-in failed. Please try again.' });
  }
};