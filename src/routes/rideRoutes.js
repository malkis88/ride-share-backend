const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  requestRide, acceptRide, updateStatus, getMyRides
} = require('../controllers/rideController');

router.post('/', auth, requestRide);
router.put('/:id/accept', auth, acceptRide);
router.put('/:id/status', auth, updateStatus);
router.get('/mine', auth, getMyRides);

module.exports = router;