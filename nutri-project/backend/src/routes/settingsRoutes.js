const express = require('express');
const router = express.Router();

// Replace with your real auth middleware that sets req.user = { id, email }
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// naive validators for simplicity
function isValidCalorieTarget(v) {
  return v === null || (Number.isFinite(v) && v >= 0 && v <= 10000);
}

router.get('/api/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  // TODO: replace with your DB code
  const user = await req.db.User.findById(userId);
  if (!user) return res.status(404).json({ error: 'not_found' });

  res.json({
    id: user.id,
    name: user.name || '',
    email: user.email,
    preferences: user.preferences || {},
    allergens: user.allergens || [],
    calorieTarget: user.calorieTarget ?? null,
    notifications: user.notifications || { menuReminders: false, weeklySummary: false }
  });
});

router.put('/api/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const {
    name,
    preferences,
    allergens,
    calorieTarget,
    notifications
  } = req.body || {};

  if (calorieTarget !== undefined && !isValidCalorieTarget(calorieTarget)) {
    return res.status(400).json({ error: 'invalid_calorieTarget' });
  }
  if (allergens && !Array.isArray(allergens)) {
    return res.status(400).json({ error: 'invalid_allergens' });
  }

  const update = {};
  if (typeof name === 'string') update.name = name;
  if (preferences && typeof preferences === 'object') update.preferences = preferences;
  if (allergens) update.allergens = allergens.slice(0, 20);
  if (calorieTarget !== undefined) update.calorieTarget = calorieTarget;
  if (notifications && typeof notifications === 'object') update.notifications = notifications;

  const saved = await req.db.User.updateById(userId, update); // adapt to your ORM
  res.json({
    id: saved.id,
    name: saved.name || '',
    email: saved.email,
    preferences: saved.preferences || {},
    allergens: saved.allergens || [],
    calorieTarget: saved.calorieTarget ?? null,
    notifications: saved.notifications || { menuReminders: false, weeklySummary: false }
  });
});

module.exports = router;
