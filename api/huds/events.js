// Vercel serverless function for GET /api/huds/events
const axios = require('axios');

const BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
const API_KEY = process.env.HUDS_API_KEY;

const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

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
    const { date, locationId } = req.query;
    
    const params = {};
    if (date) {
      params.date = formatDate(date);
    }
    if (locationId) {
      params.locationId = locationId;
    }

    // Fetch events from HUDS API
    const response = await axios.get(`${BASE_URL}/events`, {
      headers: {
        'X-Api-Key': API_KEY,
        'Accept': 'application/json',
      },
      params,
    });

    return res.status(200).json(response.data);
  } catch (error) {
    console.error('Error fetching events:', error.message);
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

