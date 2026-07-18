const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createTrip,
  getAvailableTrips,
  getMyTrips,
  getTripById,
  cancelTrip,
  startTrip,
  completeTrip,
  updateDriverLocation,
  bookTrip,
  getMyBookings,
  acceptBooking,
  rejectBooking,
   deleteTrip
} = require("../controllers/tripController");

router.post('/', auth, createTrip);
router.get('/', auth, getAvailableTrips);
router.get('/mine', auth, getMyTrips);
router.get('/bookings/mine', auth, getMyBookings);
router.get('/:id', auth, getTripById);
router.put('/:id/cancel', auth, cancelTrip);
router.put("/:id/start", auth, startTrip);

router.put("/:id/complete", auth, completeTrip);
router.delete('/:id', auth, deleteTrip);
router.put("/:id/location", auth, updateDriverLocation);
router.post('/:id/book', auth, bookTrip);
router.put(
  "/:id/bookings/:bookingId/accept",
  auth,
  acceptBooking
);

router.put(
  "/:id/bookings/:bookingId/reject",
  auth,
  rejectBooking
);

module.exports = router;