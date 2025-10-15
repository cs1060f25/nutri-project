import React, { useState } from 'react';

const DIET_GOALS = [
  'Eat cleaner',
  'More energy',
  'Better sleep',
  'Reduce stress',
  'Mindful eating',
  'Balanced nutrition'
];

const ACTIVITY_LABELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'];
const STRESS_LABELS = ['Low', 'Mild', 'Moderate', 'High', 'Very High'];
const SLEEP_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

function Questionnaire({ userId, userEmail, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    activityLevel: 1, // 0-4
    dietGoals: [],
    stressLevel: 2, // 0-4
    sleepQuality: 2 // 0-4
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalSteps = 3;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const handleDietGoalToggle = (goal) => {
    const current = formData.dietGoals;
    if (current.includes(goal)) {
      handleChange('dietGoals', current.filter(g => g !== goal));
    } else {
      handleChange('dietGoals', [...current, goal]);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.gender) {
        setError('Please fill in all fields');
        return false;
      }
    } else if (step === 2) {
      if (formData.dietGoals.length === 0) {
        setError('Please select at least one goal');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = () => {
    if (!validateStep()) return;

    setLoading(true);

    // Mock API call with localStorage
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('wellnessUsers') || '[]');
      const userIndex = users.findIndex(u => u.id === userId);

      if (userIndex === -1) {
        setError('User not found');
        setLoading(false);
        return;
      }

      users[userIndex].profile = {
        ...formData,
        activityLevel: ACTIVITY_LABELS[formData.activityLevel],
        stressLevel: STRESS_LABELS[formData.stressLevel],
        sleepQuality: SLEEP_LABELS[formData.sleepQuality],
        completedAt: new Date().toISOString()
      };

      localStorage.setItem('wellnessUsers', JSON.stringify(users));

      onComplete({
        id: userId,
        email: userEmail,
        profile: users[userIndex].profile
      });
      setLoading(false);
    }, 800);
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <h2 className="section-title">Tell us about yourself</h2>
            
            <div className="form-group">
              <label htmlFor="name" className="label">Your Name</label>
              <input
                id="name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Harvard"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender" className="label">Gender</label>
              <select
                id="gender"
                className="select"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Activity Level</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={formData.activityLevel}
                  onChange={(e) => handleChange('activityLevel', parseInt(e.target.value))}
                  className="slider"
                />
                <div className="slider-value">{ACTIVITY_LABELS[formData.activityLevel]}</div>
                <div className="slider-labels">
                  <span>Sedentary</span>
                  <span>Very Active</span>
                </div>
              </div>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="section-title">What are your wellness goals?</h2>
            <p style={{ fontSize: '14px', color: '#66BB6A', marginBottom: '20px' }}>
              Select all that apply - small steps lead to big changes 🌟
            </p>

            <div className="checkbox-group">
              {DIET_GOALS.map(goal => (
                <div
                  key={goal}
                  className={`checkbox-item ${formData.dietGoals.includes(goal) ? 'selected' : ''}`}
                  onClick={() => handleDietGoalToggle(goal)}
                >
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={formData.dietGoals.includes(goal)}
                    onChange={() => handleDietGoalToggle(goal)}
                  />
                  <span className="checkbox-label">{goal}</span>
                </div>
              ))}
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="section-title">Help us understand your lifestyle</h2>
            
            <div className="form-group">
              <label className="label">Current Stress Level</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={formData.stressLevel}
                  onChange={(e) => handleChange('stressLevel', parseInt(e.target.value))}
                  className="slider"
                />
                <div className="slider-value">{STRESS_LABELS[formData.stressLevel]}</div>
                <div className="slider-labels">
                  <span>Low</span>
                  <span>Very High</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Sleep Quality</label>
              <div className="slider-container">
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={formData.sleepQuality}
                  onChange={(e) => handleChange('sleepQuality', parseInt(e.target.value))}
                  className="slider"
                />
                <div className="slider-value">{SLEEP_LABELS[formData.sleepQuality]}</div>
                <div className="slider-labels">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#81C784', marginTop: '20px', textAlign: 'center' }}>
              We'll use this to personalize your nutrition recommendations
            </p>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container">
      <div className="icon">🌿</div>
      <h1 className="title">Let's personalize your journey</h1>
      <p className="subtitle">{userEmail}</p>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <p style={{ fontSize: '13px', color: '#81C784', marginBottom: '24px', textAlign: 'center' }}>
        Step {step} of {totalSteps}
      </p>

      {error && <div className="error">{error}</div>}

      {renderStep()}

      <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
        {step > 1 && (
          <button
            type="button"
            className="button"
            onClick={handleBack}
            style={{ flex: 1, background: 'linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%)' }}
          >
            Back
          </button>
        )}
        {step < totalSteps ? (
          <button
            type="button"
            className="button"
            onClick={handleNext}
            style={{ flex: 1 }}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="button"
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Creating Profile...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}

export default Questionnaire;
