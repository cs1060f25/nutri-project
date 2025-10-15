import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import SignUpForm from './components/SignUpForm';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import ConfirmationScreen from './components/ConfirmationScreen';

// Harvard Crimson theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#A51C30', // Harvard Crimson
      light: '#C8102E',
      dark: '#8B0000',
    },
    secondary: {
      main: '#1E1E1E',
    },
    background: {
      default: '#f5f7fa',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '1rem',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

function App() {
  const [step, setStep] = useState(1); // 1: Sign up, 2: Questionnaire, 3: Confirmation
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userData, setUserData] = useState(null);

  const handleSignUpComplete = (id, email) => {
    setUserId(id);
    setUserEmail(email);
    setStep(2);
  };

  const handleOnboardingComplete = (data) => {
    setUserData(data);
    setStep(3);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        {step === 1 && <SignUpForm onComplete={handleSignUpComplete} />}
        {step === 2 && (
          <OnboardingQuestionnaire
            userId={userId}
            userEmail={userEmail}
            onComplete={handleOnboardingComplete}
          />
        )}
        {step === 3 && <ConfirmationScreen userData={userData} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
