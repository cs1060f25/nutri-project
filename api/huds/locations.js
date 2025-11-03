// Vercel serverless function for GET /api/huds/locations
const axios = require('axios');

const BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
const API_KEY = process.env.HUDS_API_KEY;

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.get(`${BASE_URL}/locations`, {
      headers: {
        'X-Api-Key': API_KEY,
        'Accept': 'application/json',
      },
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching locations:', error.message);
    return res.status(500).json({ error: 'Failed to fetch dining locations' });
  }
};

