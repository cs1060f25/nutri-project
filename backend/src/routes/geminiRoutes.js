/**
 * Routes for Gemini-powered meal analysis
 */

const express = require('express');
const multer = require('multer');
const geminiController = require('../controllers/geminiController');

const router = express.Router();

// Configure multer for memory storage (we'll send buffer to Gemini)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'), false);
      return;
    }
    cb(null, true);
  }
});

// POST /api/analyze-meal - Upload image and get dish predictions
router.post('/analyze-meal', upload.single('image'), geminiController.analyzeMealImage);

// GET /api/analyze-meal/menu-context - See what text Gemini receives
const hudsService = require('../services/hudsService');
const geminiAnalyzer = require('../services/geminiAnalyzer');
router.get('/analyze-meal/menu-context', async (req, res) => {
  try {
    // Get combined menus from Annenberg, Quincy, Winthrop
    const menuData = await hudsService.getCombinedMenus();
    
    // Add header info
    const locationNames = menuData.map(m => m.locationName).join(', ') || 'None';
    const header = `📋 Combined Menus from Target Dining Halls\n` +
                   `🍽️  Total dining halls loaded: ${menuData.length}\n` +
                   `🏛️  Locations: ${locationNames}\n` +
                   `📅 Date: ${new Date().toLocaleDateString()}\n` +
                   `${'='.repeat(70)}\n\n`;
    
    const menuText = geminiAnalyzer.formatMenuText(menuData);
    res.type('text/plain').send(header + menuText);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

