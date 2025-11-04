// Vercel serverless function for Food Scanner
// HW8 NUTRI-71

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST method is allowed'
      }
    });
  }

  try {
    // Note: In Vercel serverless environment, file upload handling 
    // requires additional configuration or use of external storage
    // For HW8, we'll return mock data directly
    
    console.log('Processing food scan request');
    
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
    
    return res.status(200).json(mockData);
  } catch (error) {
    console.error('Error processing food scan:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL',
        message: 'An error occurred while processing the image. Please try again.'
      }
    });
  }
};
