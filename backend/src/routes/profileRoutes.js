const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/authMiddleware');

router.use(verifyToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);

module.exports = router;
