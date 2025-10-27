// Test endpoint to check environment variables
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  const envCheck = {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'NOT SET',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'SET' : 'NOT SET',
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY ? 'SET' : 'NOT SET',
  };
  
  console.log('Environment variables check:', envCheck);
  
  res.status(200).json({
    message: 'Environment variables check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
};
