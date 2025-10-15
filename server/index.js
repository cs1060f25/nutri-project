const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Mock database
const users = [];

// API Routes

// Sign up endpoint
app.post('/api/auth/signup', (req, res) => {
  const { email, password } = req.body;
  
  // Validate Harvard email
  if (!email.endsWith('@college.harvard.edu')) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please use a valid Harvard College email (@college.harvard.edu)' 
    });
  }
  
  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ 
      success: false, 
      message: 'An account with this email already exists' 
    });
  }
  
  // Create user
  const newUser = {
    id: Date.now().toString(),
    email,
    password, // In production, this should be hashed
    createdAt: new Date()
  };
  
  users.push(newUser);
  
  res.json({ 
    success: true, 
    message: 'Account created successfully',
    userId: newUser.id 
  });
});

// Complete onboarding endpoint
app.post('/api/onboarding/complete', (req, res) => {
  const { userId, name, gender, sportType, trainingFrequency, dietGoal } = req.body;
  
  // Find user and update profile
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }
  
  user.profile = {
    name,
    gender,
    sportType,
    trainingFrequency,
    dietGoal,
    completedAt: new Date()
  };
  
  res.json({ 
    success: true, 
    message: 'Onboarding completed successfully',
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
    }
  });
});

// Get user profile endpoint
app.get('/api/user/:userId', (req, res) => {
  const { userId } = req.params;
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: 'User not found' 
    });
  }
  
  res.json({ 
    success: true, 
    user: {
      id: user.id,
      email: user.email,
      profile: user.profile
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'CrimsonFuel API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 CrimsonFuel server running on http://localhost:${PORT}`);
});
