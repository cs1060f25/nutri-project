import React, { useState } from 'react';
import axios from 'axios';

function OnboardingQuestionnaire({ userId, userEmail, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    glutenFree: false,
    foodPreferences: [],
    activityLevel: '',
    dietGoal: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const totalSteps = 3;

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const handleFoodPreferenceToggle = (preference) => {
    const current = formData.foodPreferences;
    if (current.includes(preference)) {
      handleChange('foodPreferences', current.filter(p => p !== preference));
    } else {
      handleChange('foodPreferences', [...current, preference]);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.gender) {
        setError('Please fill in all fields');
        return false;
      }
    } else if (step === 2) {
      if (!formData.activityLevel) {
        setError('Please select your activity level');
        return false;
      }
    } else if (step === 3) {
      if (!formData.dietGoal) {
        setError('Please select a diet goal');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);

    try {
      const response = await axios.post('/api/onboarding/complete', {
        userId,
        ...formData,
        foodPreferences: formData.foodPreferences.join(', '),
      });

      if (response.data.success) {
        onComplete(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="section-title">Personal Information</h2>
            <p className="subtitle">Let's get to know you</p>

            <div className="input-group">
              <label htmlFor="name" className="input-label">Full Name</label>
              <input
                id="name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="John Harvard"
                required
                aria-required="true"
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label htmlFor="gender" className="input-label">Gender</label>
              <select
                id="gender"
                className="select"
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                required
                aria-required="true"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-binary</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </div>

            <div className="checkbox-group">
              <label className="input-label">Dietary Restrictions</label>
              <div
                className={`checkbox-option ${formData.glutenFree ? 'selected' : ''}`}
                onClick={() => handleChange('glutenFree', !formData.glutenFree)}
                role="checkbox"
                aria-checked={formData.glutenFree}
                tabIndex="0"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleChange('glutenFree', !formData.glutenFree);
                  }
                }}
              >
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={formData.glutenFree}
                  onChange={(e) => handleChange('glutenFree', e.target.checked)}
                  aria-label="I am gluten-free"
                />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '17px' }}>🌾 I am Gluten-Free</div>
                  <div style={{ fontSize: '15px', color: '#8E8E93', marginTop: '4px' }}>
                    We'll help you find safe dining options
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="section-title">Food Preferences</h2>
            <p className="subtitle">Help us personalize your experience</p>

            <div className="checkbox-group">
              <label className="input-label">Select Your Preferences (Optional)</label>
              {['Vegetarian', 'Vegan', 'Dairy-Free', 'Nut-Free', 'Low-Carb', 'High-Protein'].map((pref) => (
                <div
                  key={pref}
                  className={`checkbox-option ${formData.foodPreferences.includes(pref) ? 'selected' : ''}`}
                  onClick={() => handleFoodPreferenceToggle(pref)}
                  role="checkbox"
                  aria-checked={formData.foodPreferences.includes(pref)}
                  tabIndex="0"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleFoodPreferenceToggle(pref);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={formData.foodPreferences.includes(pref)}
                    onChange={() => handleFoodPreferenceToggle(pref)}
                    aria-label={pref}
                  />
                  <span style={{ fontWeight: '500', fontSize: '17px' }}>{pref}</span>
                </div>
              ))}
            </div>

            <div className="input-group" style={{ marginTop: '24px' }}>
              <label htmlFor="activity-level" className="input-label">Activity Level</label>
              <select
                id="activity-level"
                className="select"
                value={formData.activityLevel}
                onChange={(e) => handleChange('activityLevel', e.target.value)}
                required
                aria-required="true"
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary (Little to no exercise)</option>
                <option value="light">Light (1-2 days/week)</option>
                <option value="moderate">Moderate (3-5 days/week)</option>
                <option value="active">Active (6-7 days/week)</option>
                <option value="very-active">Very Active (Athlete, 2x/day)</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="section-title">Nutrition Goals</h2>
            <p className="subtitle">What's your primary objective?</p>

            <div className="radio-group">
              {[
                { value: 'weight-loss', label: 'Weight Loss', desc: 'Reduce body fat while maintaining energy' },
                { value: 'muscle-gain', label: 'Muscle Gain', desc: 'Build strength and increase muscle mass' },
                { value: 'maintenance', label: 'Maintenance', desc: 'Maintain current weight and health' },
                { value: 'performance', label: 'Peak Performance', desc: 'Optimize energy for academics and activities' },
              ].map((goal) => (
                <div
                  key={goal.value}
                  className={`radio-option ${formData.dietGoal === goal.value ? 'selected' : ''}`}
                  onClick={() => handleChange('dietGoal', goal.value)}
                  role="radio"
                  aria-checked={formData.dietGoal === goal.value}
                  tabIndex="0"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleChange('dietGoal', goal.value);
                    }
                  }}
                >
                  <input
                    type="radio"
                    className="radio-input"
                    name="dietGoal"
                    value={goal.value}
                    checked={formData.dietGoal === goal.value}
                    onChange={(e) => handleChange('dietGoal', e.target.value)}
                    aria-label={goal.label}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '17px' }}>{goal.label}</div>
                    <div style={{ fontSize: '15px', color: '#8E8E93', marginTop: '4px' }}>
                      {goal.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 className="title" style={{ fontSize: '28px' }}>Welcome!</h1>
          <p style={{ fontSize: '15px', color: '#8E8E93' }}>{userEmail}</p>
        </div>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(step / totalSteps) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin="1"
            aria-valuemax={totalSteps}
            aria-label={`Step ${step} of ${totalSteps}`}
          />
        </div>

        <p style={{ fontSize: '13px', color: '#8E8E93', marginBottom: '24px', textAlign: 'center' }}>
          Step {step} of {totalSteps}
        </p>

        {error && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        {renderStep()}

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          {step > 1 && (
            <button
              type="button"
              className="button button-secondary"
              onClick={handleBack}
              style={{ flex: 1 }}
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
              Next
            </button>
          ) : (
            <button
              type="button"
              className="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{ flex: 1 }}
              aria-busy={loading}
            >
              {loading ? 'Completing...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingQuestionnaire;
