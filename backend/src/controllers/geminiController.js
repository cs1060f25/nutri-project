const geminiAnalyzer = require('../services/geminiAnalyzer');
const hudsService = require('../services/hudsService');
const nutritionCalculator = require('../services/nutritionCalculator');

/**
 * Analyze a meal image and return dish predictions
 */
const analyzeMealImage = async (req, res) => {
  try {
    // Check if image was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No image file provided. Please upload an image.' 
      });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Please upload a JPEG or PNG image.' 
      });
    }

    // Get combined menus from Annenberg, Quincy, and Winthrop
    // This covers all unique dining hall menus
    const menuData = await hudsService.getCombinedMenus();
    
    if (!menuData || menuData.length === 0) {
      return res.status(404).json({ 
        error: 'No menu data available for today. Please try again later.' 
      });
    }

    console.log(`🍽️  Analyzing with menus from ${menuData.length} dining hall(s)`);

    // Analyze the image with Gemini
    const result = await geminiAnalyzer.analyzeMealImage(req.file.buffer, menuData);

    // If no dishes were detected, return a clear error instead of zeroed totals
    if (!result.predictions || result.predictions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'We could not detect any HUDS menu items in this photo. Try a clearer picture of your plate.'
      });
    }

    // Calculate nutrition totals from predictions
    const macros = nutritionCalculator.calculateMealMacros(result.predictions, menuData);

    res.json({
      success: true,
      predictions: result.predictions,
      nutritionTotals: macros.nutritionTotals,
      matchedItems: macros.matchedItems,
      unmatchedDishes: macros.unmatchedDishes,
      menuAvailable: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error analyzing meal image:', error);
    
    // Return appropriate error message
    const statusCode = error.message.includes('API key') ? 500 : 400;
    res.status(statusCode).json({ 
      error: error.message || 'Failed to analyze meal image',
      success: false
    });
  }
};

module.exports = {
  analyzeMealImage
};

