import React, { useState } from 'react';
import { ThemeProvider, PartialTheme } from '@fluentui/react';
import ChatOnboarding from './components/ChatOnboarding';
import ConfirmationPage from './components/ConfirmationPage';
import './App.css';

// Microsoft Fluent Design theme
const fluentTheme = {
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#eff6fc',
    themeLighter: '#deecf9',
    themeLight: '#c7e0f4',
    themeTertiary: '#71afe5',
    themeSecondary: '#2b88d8',
    themeDarkAlt: '#106ebe',
    themeDark: '#005a9e',
    themeDarker: '#004578',
    neutralLighterAlt: '#faf9f8',
    neutralLighter: '#f3f2f1',
    neutralLight: '#edebe9',
    neutralQuaternaryAlt: '#e1dfdd',
    neutralQuaternary: '#d0d0d0',
    neutralTertiaryAlt: '#c8c6c4',
    neutralTertiary: '#a19f9d',
    neutralSecondary: '#605e5c',
    neutralPrimaryAlt: '#3b3a39',
    neutralPrimary: '#323130',
    neutralDark: '#201f1e',
    black: '#000000',
    white: '#ffffff',
  }
};

function App() {
  const [step, setStep] = useState('chat'); // 'chat' or 'confirmation'
  const [userData, setUserData] = useState(null);

  const handleOnboardingComplete = (data) => {
    setUserData(data);
    setStep('confirmation');
  };

  return (
    <ThemeProvider theme={fluentTheme}>
      <div className="App">
        {step === 'chat' && <ChatOnboarding onComplete={handleOnboardingComplete} />}
        {step === 'confirmation' && <ConfirmationPage userData={userData} />}
      </div>
    </ThemeProvider>
  );
}

export default App;
