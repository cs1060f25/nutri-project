const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5002;

// Middleware
app.use(cors());
app.use(express.json());

// Mock PostgreSQL database (in-memory)
const users = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CrimsonFuel Wellness API running' });
});

// Create account
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  // Validate Harvard email
  if (!email.endsWith('@college.harvard.edu')) {
    return res.status(400).json({
      success: false,
      message: 'Please use your Harvard College email'
    });
  }
  
  // Check if user exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Account already exists'
    });
  }
  
  // Create user
  const newUser = {
    id: Date.now().toString(),
    email,
    password, // In production, hash this!
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    userId: newUser.id
  });
});

// Complete onboarding
app.post('/api/onboarding/complete', (req, res) => {
  const { userId, name, gender, activityLevel, dietGoals, stressLevel, sleepQuality } = req.body;
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }
  
  // Update user profile
  user.profile = {
    name,
    gender,
    activityLevel,
    dietGoals,
    stressLevel,
    sleepQuality,
    completedAt: new Date()
  };
  
  res.json({
    success: true,
    message: 'Welcome to your wellness journey!',
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
    }
  });
});

app.listen(PORT, () => {
  console.log(`🌱 CrimsonFuel Wellness API running on http://localhost:${PORT}`);
});
