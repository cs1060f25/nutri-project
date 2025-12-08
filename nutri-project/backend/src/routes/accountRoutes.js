const express = require('express');
const router = express.Router();

const {
  changePasswordController,
  deleteAccountController,
} = require('../controllers/accountController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes here require authentication
router.use(verifyToken);

router.post('/change-password', changePasswordController);
router.post('/delete-account', deleteAccountController);

module.exports = router;
