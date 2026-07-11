const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMe, updateAvailability } = require('../controllers/userController');

router.get('/me', auth, getMe);
router.put('/me/availability', auth, updateAvailability);

module.exports = router;