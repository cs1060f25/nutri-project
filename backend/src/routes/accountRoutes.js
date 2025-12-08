const express = require('express');
const router = express.Router();

const {
  changePasswordController,
  deleteAccountController,
} = require('../controllers/accountController');
const { verifyToken } = require('../middleware/authMiddleware');

// All account routes require a valid Firebase ID token
router.use(verifyToken);

router.post('/change-password', changePasswordController);
router.post('/delete-account', deleteAccountController);

module.exports = router;
