// Vercel serverless function for GET /api/huds/menu/date
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
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const params = { date: formatDate(date) };
    if (locationId) {
      params.locationId = locationId;
    }

    // Fetch recipes from HUDS API
    const response = await axios.get(`${BASE_URL}/recipes`, {
      headers: {
        'X-Api-Key': API_KEY,
        'Accept': 'application/json',
      },
      params,
    });

    const recipes = response.data;

    // Transform flat array into nested structure by location -> meal -> category
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
  } catch (error) {
    console.error('Error fetching menu by date:', error.message);
    return res.status(500).json({ error: 'Failed to fetch menu for the specified date' });
  }
};

