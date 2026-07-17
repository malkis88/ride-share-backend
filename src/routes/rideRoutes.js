const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  requestRide,
  acceptRide,
  updateStatus,
  getMyRides,
  getAvailableRides,
  getRideById,
  cancelRide,
  startRide,
  completeRide,
  rateRide,
} = require("../controllers/rideController");

router.get('/fare-config', auth, getFareConfig);
router.get("/:id", auth, getRideById);

router.put("/:id/cancel", auth, cancelRide);

router.put("/:id/start", auth, startRide);

router.put("/:id/complete", auth, completeRide);

router.put("/:id/rate", auth, rateRide);

router.post('/', auth, requestRide);
router.get('/mine', auth, getMyRides);
router.get('/available', auth, getAvailableRides);
router.put('/:id/accept', auth, acceptRide);
router.put('/:id/status', auth, updateStatus);

module.exports = router;