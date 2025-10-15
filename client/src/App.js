import React, { useState } from 'react';
import './App.css';
import SignUpForm from './components/SignUpForm';
import OnboardingQuestionnaire from './components/OnboardingQuestionnaire';
import SuccessScreen from './components/SuccessScreen';

function App() {
  const [step, setStep] = useState(1); // 1: Sign up, 2: Questionnaire, 3: Success
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
    <div className="App">
      {step === 1 && <SignUpForm onComplete={handleSignUpComplete} />}
      {step === 2 && (
        <OnboardingQuestionnaire
          userId={userId}
          userEmail={userEmail}
          onComplete={handleOnboardingComplete}
        />
      )}
      {step === 3 && <SuccessScreen userData={userData} />}
    </div>
  );
}

export default App;
