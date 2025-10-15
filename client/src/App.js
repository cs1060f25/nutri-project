import React, { useState } from 'react';
import './App.css';
import SignUp from './components/SignUp';
import Questionnaire from './components/Questionnaire';
import Confirmation from './components/Confirmation';

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

  const handleQuestionnaireComplete = (data) => {
    setUserData(data);
    setStep(3);
  };

  return (
    <div className="App">
      {step === 1 && <SignUp onComplete={handleSignUpComplete} />}
      {step === 2 && (
        <Questionnaire
          userId={userId}
          userEmail={userEmail}
          onComplete={handleQuestionnaireComplete}
        />
      )}
      {step === 3 && <Confirmation userData={userData} />}
    </div>
  );
}

export default App;
