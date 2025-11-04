/**
 * Controller for Food Scanner - Mock AI processing
 * HW8 NUTRI-71
 */

/**
 * Scan uploaded food image and return mock nutritional data
 * @route POST /api/scan
 */
const scanFood = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No image file uploaded. Please upload a JPG or PNG image.'
        }
      });
    }

    // Log file details
    console.log('Processing food scan:', {
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Simulate AI processing delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate mock nutritional data
    const mockData = {
      protein: parseFloat((Math.random() * 40 + 10).toFixed(1)),
      carbs: parseFloat((Math.random() * 60 + 20).toFixed(1)),
      fat: parseFloat((Math.random() * 30 + 5).toFixed(1)),
      calories: 0,
      timestamp: new Date().toISOString()
    };

    // Calculate calories based on macros (4-4-9 rule)
    mockData.calories = Math.round(
      mockData.protein * 4 + mockData.carbs * 4 + mockData.fat * 9
    );

    console.log('Scan complete:', mockData);

    res.status(200).json(mockData);
  } catch (error) {
    console.error('Error processing food scan:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'An error occurred while processing the image. Please try again.'
      }
    });
  }
};

module.exports = {
  scanFood
};
