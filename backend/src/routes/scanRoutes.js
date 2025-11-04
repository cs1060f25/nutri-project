const express = require('express');
const router = express.Router();
const multer = require('multer');
const scanController = require('../controllers/scanController');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// POST /api/scan - Upload and scan food image
router.post('/', upload.single('image'), scanController.scanFood);

module.exports = router;
