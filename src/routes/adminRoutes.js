const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  getDriverApplications,
  getDriverById,
  reviewDriver,
} = require('../controllers/adminController');

router.get('/drivers', auth, adminAuth, getDriverApplications);
router.get('/drivers/:id', auth, adminAuth, getDriverById);
router.put('/drivers/:id/review', auth, adminAuth, reviewDriver);

module.exports = router;