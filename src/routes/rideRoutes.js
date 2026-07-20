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
  rejectRide,
} = require("../controllers/rideController");

// Specific/static routes MUST come before "/:id" — otherwise Express
// matches "/mine" and "/available" as if "mine"/"available" were an :id
// param, which crashes getRideById with a CastError (500).
router.post('/', auth, requestRide);
router.get('/mine', auth, getMyRides);
router.get('/available', auth, getAvailableRides);

// Now the parameterized routes
router.get("/:id", auth, getRideById);
router.put("/:id/cancel", auth, cancelRide);
router.put("/:id/start", auth, startRide);
router.put("/:id/complete", auth, completeRide);
router.put("/:id/rate", auth, rateRide);
router.put('/:id/reject', auth, rejectRide);
router.put('/:id/accept', auth, acceptRide);
router.put('/:id/status', auth, updateStatus);

module.exports = router;