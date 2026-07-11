const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  requestRide, acceptRide, updateStatus, getMyRides, getAvailableRides
} = require('../controllers/rideController');

router.post('/', auth, requestRide);
router.get('/mine', auth, getMyRides);
router.get('/available', auth, getAvailableRides);
router.put('/:id/accept', auth, acceptRide);
router.put('/:id/status', auth, updateStatus);

module.exports = router;