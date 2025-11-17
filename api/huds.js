// Consolidated Vercel serverless function for ALL HUDS API endpoints
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
    // Extract path from req.url
    // In Vercel, req.url typically contains the ORIGINAL request URL even after rewrite
    // So /api/huds/locations should have req.url = '/api/huds/locations'
    let path = req.url || '';
    
    // Log for debugging
    console.log('HUDS API request:', {
      url: req.url,
      method: req.method,
      query: req.query,
      headers: {
        'x-vercel-rewrite-path': req.headers['x-vercel-rewrite-path'],
        'x-invoke-path': req.headers['x-invoke-path']
      }
    });
    
    // Remove query string if present
    path = path.split('?')[0];
    
    // Check if this is the original path or rewritten path
    // If path is just '/api/huds', the rewrite stripped it - check headers
    if (path === '/api/huds' || path === '/api/huds/') {
      // Try to get original path from Vercel headers
      const originalPath = req.headers['x-vercel-rewrite-path'] || 
                          req.headers['x-invoke-path'] ||
                          req.headers['x-original-url'];
      
      if (originalPath) {
        path = originalPath.split('?')[0]; // Remove query string
      }
    }
    
    // Remove /api/huds prefix to get just the path segment
    path = path.replace('/api/huds', '').replace(/^\/+/, '') || '';
    
    // Ensure path starts with / if it exists
    if (path && !path.startsWith('/')) {
      path = '/' + path;
    }
    
    // Handle empty path (request to /api/huds itself)
    if (!path || path === '') {
      path = '/';
    }
    
    console.log('Extracted path:', path);
    
    // Route: GET /api/huds/locations
    if (path === '/locations' || path === 'locations') {
      const response = await axios.get(`${BASE_URL}/locations`, {
        headers: {
          'X-Api-Key': API_KEY,
          'Accept': 'application/json',
        },
      });
      return res.status(200).json(response.data);
    }
    
    // Route: GET /api/huds/events
    if (path.startsWith('/events') || path.startsWith('events')) {
      const { date, locationId } = req.query;
      const params = {};
      if (date) params.date = formatDate(date);
      if (locationId) params.locationId = locationId;
      
      const response = await axios.get(`${BASE_URL}/events`, {
        headers: {
          'X-Api-Key': API_KEY,
          'Accept': 'application/json',
        },
        params,
      });
      return res.status(200).json(response.data);
    }
    
    // Route: GET /api/huds/menu/today
    if (path === '/menu/today' || path === 'menu/today') {
      const { locationId } = req.query;
      const today = formatDate(new Date());
      const params = { date: today };
      if (locationId) {
        // Ensure locationId is a string for the API
        params.locationId = String(locationId);
      }

      console.log('Fetching today\'s menu with params:', params);

      const response = await axios.get(`${BASE_URL}/recipes`, {
        headers: {
          'X-Api-Key': API_KEY,
          'Accept': 'application/json',
        },
        params,
      });

      const recipes = response.data || [];
      console.log(`Received ${recipes.length} recipes for today`);

      const menuByLocation = {};

      recipes.forEach(recipe => {
        const locNum = recipe.Location_Number;
        const locName = recipe.Location_Name;
        const mealNum = recipe.Meal_Number;
        const mealName = recipe.Meal_Name;
        const categoryNum = recipe.Menu_Category_Number;
        const categoryName = recipe.Menu_Category_Name;

        if (!menuByLocation[locNum]) {
          menuByLocation[locNum] = {
            locationNumber: locNum,
            locationName: locName,
            meals: {},
          };
        }

        if (!menuByLocation[locNum].meals[mealNum]) {
          menuByLocation[locNum].meals[mealNum] = {
            mealNumber: mealNum,
            mealName: mealName,
            categories: {},
          };
        }

        if (!menuByLocation[locNum].meals[mealNum].categories[categoryNum]) {
          menuByLocation[locNum].meals[mealNum].categories[categoryNum] = {
            categoryNumber: categoryNum,
            categoryName: categoryName,
            recipes: [],
          };
        }

        menuByLocation[locNum].meals[mealNum].categories[categoryNum].recipes.push(recipe);
      });

      const result = Object.values(menuByLocation);
      console.log(`Returning ${result.length} locations with menu data`);
      
      // If filtering by locationId and no results, return empty array instead of error
      if (locationId && result.length === 0) {
        console.warn(`No menu data found for locationId: ${locationId} on ${today}`);
      }

      return res.status(200).json(result);
    }
    
    // Route: GET /api/huds/menu/date
    if (path === '/menu/date' || path === 'menu/date') {
      const { date, locationId } = req.query;
      
      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      const params = { date: formatDate(date) };
      if (locationId) params.locationId = locationId;

      const response = await axios.get(`${BASE_URL}/recipes`, {
        headers: {
          'X-Api-Key': API_KEY,
          'Accept': 'application/json',
        },
        params,
      });

      const recipes = response.data;
      const menuByLocation = {};

      recipes.forEach(recipe => {
        const locNum = recipe.Location_Number;
        const locName = recipe.Location_Name;
        const mealNum = recipe.Meal_Number;
        const mealName = recipe.Meal_Name;
        const categoryNum = recipe.Menu_Category_Number;
        const categoryName = recipe.Menu_Category_Name;

        if (!menuByLocation[locNum]) {
          menuByLocation[locNum] = {
            locationNumber: locNum,
            locationName: locName,
            meals: {},
          };
        }

        if (!menuByLocation[locNum].meals[mealNum]) {
          menuByLocation[locNum].meals[mealNum] = {
            mealNumber: mealNum,
            mealName: mealName,
            categories: {},
          };
        }

        if (!menuByLocation[locNum].meals[mealNum].categories[categoryNum]) {
          menuByLocation[locNum].meals[mealNum].categories[categoryNum] = {
            categoryNumber: categoryNum,
            categoryName: categoryName,
            recipes: [],
          };
        }

        menuByLocation[locNum].meals[mealNum].categories[categoryNum].recipes.push(recipe);
      });

      return res.status(200).json(Object.values(menuByLocation));
    }

    // Route not found
    return res.status(404).json({ error: 'HUDS endpoint not found' });

  } catch (error) {
    console.error('HUDS API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch from HUDS API' });
  }
};

