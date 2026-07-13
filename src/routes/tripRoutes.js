const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  createTrip,
  getAvailableTrips,
  getMyTrips,
  cancelTrip,
  bookTrip,
  getMyBookings,
} = require('../controllers/tripController');

router.post('/', auth, createTrip);
router.get('/', auth, getAvailableTrips);
router.get('/mine', auth, getMyTrips);
router.get('/bookings/mine', auth, getMyBookings);
router.put('/:id/cancel', auth, cancelTrip);
router.post('/:id/book', auth, bookTrip);

module.exports = router;