const express = require('express');
const router = express.Router();
const { googleAuth, appleAuth } = require('../controllers/oauthController');

router.post('/google', googleAuth);
router.post('/apple', appleAuth);

module.exports = router;