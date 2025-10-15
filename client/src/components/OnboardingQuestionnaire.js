import React, { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { Person, FitnessCenter } from '@mui/icons-material';

const steps = ['Personal Info', 'Athletic Profile', 'Nutrition Goals'];

function OnboardingQuestionnaire({ userId, userEmail, onComplete }) {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    sportType: '',
    trainingFrequency: '',
    dietGoal: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const validateStep = () => {
    if (activeStep === 0) {
      if (!formData.name || !formData.gender) {
        setError('Please fill in all fields');
        return false;
      }
    } else if (activeStep === 1) {
      if (!formData.sportType || !formData.trainingFrequency) {
        setError('Please fill in all fields');
        return false;
      }
    } else if (activeStep === 2) {
      if (!formData.dietGoal) {
        setError('Please select a diet goal');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);

    // Simulate API call with setTimeout (mock backend)
    setTimeout(() => {
      try {
        // Get users from localStorage
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        // Update user with profile data
        users[userIndex].profile = {
          name: formData.name,
          gender: formData.gender,
          sportType: formData.sportType,
          trainingFrequency: formData.trainingFrequency,
          dietGoal: formData.dietGoal,
          completedAt: new Date().toISOString()
        };
        
        localStorage.setItem('users', JSON.stringify(users));
        
        // Success - move to confirmation screen
        onComplete({
          id: userId,
          email: userEmail,
          profile: users[userIndex].profile
        });
      } catch (err) {
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500); // Simulate network delay
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" /> Personal Information
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Let's start with the basics
            </Typography>

            <TextField
              fullWidth
              label="Full Name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              margin="normal"
              required
              placeholder="John Harvard"
            />

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Gender</InputLabel>
              <Select
                value={formData.gender}
                label="Gender"
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="non-binary">Non-binary</MenuItem>
                <MenuItem value="prefer-not-to-say">Prefer not to say</MenuItem>
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FitnessCenter color="primary" /> Athletic Profile
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Tell us about your training
            </Typography>

            <FormControl fullWidth margin="normal" required>
              <InputLabel>Sport Type</InputLabel>
              <Select
                value={formData.sportType}
                label="Sport Type"
                onChange={(e) => handleChange('sportType', e.target.value)}
              >
                <MenuItem value="football">Football</MenuItem>
                <MenuItem value="basketball">Basketball</MenuItem>
                <MenuItem value="soccer">Soccer</MenuItem>
                <MenuItem value="rowing">Rowing</MenuItem>
                <MenuItem value="track-field">Track & Field</MenuItem>
                <MenuItem value="swimming">Swimming</MenuItem>
                <MenuItem value="lacrosse">Lacrosse</MenuItem>
                <MenuItem value="hockey">Hockey</MenuItem>
                <MenuItem value="tennis">Tennis</MenuItem>
                <MenuItem value="cross-country">Cross Country</MenuItem>
                <MenuItem value="wrestling">Wrestling</MenuItem>
                <MenuItem value="volleyball">Volleyball</MenuItem>
                <MenuItem value="general-fitness">General Fitness</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <FormControl component="fieldset" margin="normal" required fullWidth>
              <FormLabel component="legend" sx={{ mb: 1 }}>Training Frequency</FormLabel>
              <RadioGroup
                value={formData.trainingFrequency}
                onChange={(e) => handleChange('trainingFrequency', e.target.value)}
              >
                <FormControlLabel
                  value="1-2-days"
                  control={<Radio />}
                  label="1-2 days per week (Light)"
                />
                <FormControlLabel
                  value="3-4-days"
                  control={<Radio />}
                  label="3-4 days per week (Moderate)"
                />
                <FormControlLabel
                  value="5-6-days"
                  control={<Radio />}
                  label="5-6 days per week (Intense)"
                />
                <FormControlLabel
                  value="daily"
                  control={<Radio />}
                  label="Daily training (Elite)"
                />
              </RadioGroup>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Nutrition Goals
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              What's your primary nutrition objective?
            </Typography>

            <FormControl component="fieldset" fullWidth required>
              <RadioGroup
                value={formData.dietGoal}
                onChange={(e) => handleChange('dietGoal', e.target.value)}
              >
                <Paper
                  elevation={formData.dietGoal === 'muscle-gain' ? 3 : 1}
                  sx={{ p: 2, mb: 2, cursor: 'pointer', border: formData.dietGoal === 'muscle-gain' ? '2px solid' : '1px solid', borderColor: formData.dietGoal === 'muscle-gain' ? 'primary.main' : 'divider' }}
                  onClick={() => handleChange('dietGoal', 'muscle-gain')}
                >
                  <FormControlLabel
                    value="muscle-gain"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Muscle Gain
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Build strength and increase muscle mass
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper
                  elevation={formData.dietGoal === 'weight-loss' ? 3 : 1}
                  sx={{ p: 2, mb: 2, cursor: 'pointer', border: formData.dietGoal === 'weight-loss' ? '2px solid' : '1px solid', borderColor: formData.dietGoal === 'weight-loss' ? 'primary.main' : 'divider' }}
                  onClick={() => handleChange('dietGoal', 'weight-loss')}
                >
                  <FormControlLabel
                    value="weight-loss"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Weight Loss
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Reduce body fat while maintaining performance
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper
                  elevation={formData.dietGoal === 'maintenance' ? 3 : 1}
                  sx={{ p: 2, mb: 2, cursor: 'pointer', border: formData.dietGoal === 'maintenance' ? '2px solid' : '1px solid', borderColor: formData.dietGoal === 'maintenance' ? 'primary.main' : 'divider' }}
                  onClick={() => handleChange('dietGoal', 'maintenance')}
                >
                  <FormControlLabel
                    value="maintenance"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Maintenance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Maintain current weight and optimize nutrition
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>

                <Paper
                  elevation={formData.dietGoal === 'performance' ? 3 : 1}
                  sx={{ p: 2, mb: 2, cursor: 'pointer', border: formData.dietGoal === 'performance' ? '2px solid' : '1px solid', borderColor: formData.dietGoal === 'performance' ? 'primary.main' : 'divider' }}
                  onClick={() => handleChange('dietGoal', 'performance')}
                >
                  <FormControlLabel
                    value="performance"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          Peak Performance
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Optimize energy and recovery for competition
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </RadioGroup>
            </FormControl>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" color="primary" gutterBottom>
              Welcome to CrimsonFuel
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {userEmail}
            </Typography>
          </Box>

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <LinearProgress
            variant="determinate"
            value={(activeStep / steps.length) * 100}
            sx={{ mb: 3, height: 6, borderRadius: 3 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {renderStepContent()}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Completing...' : 'Complete Setup'}
              </Button>
            ) : (
              <Button variant="contained" onClick={handleNext}>
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default OnboardingQuestionnaire;
