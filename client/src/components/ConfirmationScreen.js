import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  FitnessCenter,
  Restaurant,
  TrendingUp,
  CalendarToday,
  Person,
} from '@mui/icons-material';

function ConfirmationScreen({ userData }) {
  const { profile, email } = userData;

  const getDietGoalDisplay = (goal) => {
    const goals = {
      'muscle-gain': 'Muscle Gain',
      'weight-loss': 'Weight Loss',
      'maintenance': 'Maintenance',
      'performance': 'Peak Performance',
    };
    return goals[goal] || goal;
  };

  const getTrainingFrequencyDisplay = (freq) => {
    const frequencies = {
      '1-2-days': '1-2 days/week',
      '3-4-days': '3-4 days/week',
      '5-6-days': '5-6 days/week',
      'daily': 'Daily',
    };
    return frequencies[freq] || freq;
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
            <CheckCircle
              sx={{ fontSize: 80, color: 'success.main', mb: 2 }}
            />
            <Typography variant="h4" color="primary" gutterBottom>
              Welcome Aboard, {profile.name}!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Your CrimsonFuel account is ready to go
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Your Profile Summary
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Person sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Personal Info
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold">
                    {profile.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {email}
                  </Typography>
                  <Chip
                    label={profile.gender}
                    size="small"
                    sx={{ mt: 1, textTransform: 'capitalize' }}
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <FitnessCenter sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="subtitle2" color="text.secondary">
                      Athletic Profile
                    </Typography>
                  </Box>
                  <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {profile.sportType.replace('-', ' ')}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {getTrainingFrequencyDisplay(profile.trainingFrequency)}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'primary.main', color: 'white' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TrendingUp sx={{ mr: 1 }} />
                    <Typography variant="subtitle2">
                      Nutrition Goal
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {getDietGoalDisplay(profile.dietGoal)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
            Dashboard Preview
          </Typography>

          <Card variant="outlined" sx={{ mb: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <Restaurant sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Meals Logged
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      --
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Daily Calories
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 2 }}>
                    <FitnessCenter sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      0
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Workouts Tracked
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 1.5, mb: 2 }}
            >
              Go to Dashboard
            </Button>
            <Typography variant="body2" color="text.secondary">
              Start tracking your nutrition and reach your goals!
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default ConfirmationScreen;
