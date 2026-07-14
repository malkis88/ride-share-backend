const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getMe, updateAvailability, updatePushToken } = require('../controllers/userController');

router.get('/me', auth, getMe);
router.put('/me/availability', auth, updateAvailability);
router.put('/me/push-token', auth, updatePushToken);

module.exports = router;