import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [residence, setResidence] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Multi-step registration form state
  const [registrationStep, setRegistrationStep] = useState(1);
  const totalSteps = 6;

  // Additional registration fields
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [dietaryPattern, setDietaryPattern] = useState('');
  const [isKosher, setIsKosher] = useState(false);
  const [isHalal, setIsHalal] = useState(false);
  const [allergies, setAllergies] = useState([]);
  const [healthConditions, setHealthConditions] = useState([]);
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [dataAgreementAccepted, setDataAgreementAccepted] = useState(false);

  // Harvard Houses and Dorms
  const harvardResidences = [
    // Freshman Dorms
    'Apley Court',
    'Canaday Hall',
    'Grays Hall',
    'Greenough Hall',
    'Hollis Hall',
    'Holworthy Hall',
    'Hurlbut Hall',
    'Lionel Hall',
    'Mower Hall',
    'Massachusetts Hall',
    'Matthews Hall',
    'Pennypacker Hall',
    'Stoughton Hall',
    'Straus Hall',
    'Thayer Hall',
    'Weld Hall',
    'Wigglesworth Hall',
    // Upperclass Houses
    'Adams House',
    'Cabot House',
    'Currier House',
    'Dunster House',
    'Eliot House',
    'Kirkland House',
    'Leverett House',
    'Lowell House',
    'Mather House',
    'Pforzheimer House',
    'Quincy House',
    'Winthrop House',
  ];

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  // Allergy options
  const allergyOptions = [
    'Milk/Dairy',
    'Eggs',
    'Fish',
    'Shellfish',
    'Tree Nuts',
    'Peanuts',
    'Wheat/Gluten',
    'Soy',
    'Sesame'
  ];

  // Health condition options
  const healthConditionOptions = [
    'High Blood Pressure / Hypertension',
    'High Cholesterol',
    'Diabetes / Blood Sugar Management',
    'Heart Disease / Cardiovascular Concerns',
    'Kidney Disease / Kidney Concerns'
  ];

  const handleAllergyToggle = (allergy) => {
    setAllergies(prev =>
      prev.includes(allergy)
        ? prev.filter(a => a !== allergy)
        : [...prev, allergy]
    );
  };

  const handleHealthConditionToggle = (condition) => {
    setHealthConditions(prev =>
      prev.includes(condition)
        ? prev.filter(c => c !== condition)
        : [...prev, condition]
    );
  };

  const nextStep = () => {
    if (registrationStep < totalSteps) {
      setRegistrationStep(registrationStep + 1);
      setError('');
    }
  };

  const prevStep = () => {
    if (registrationStep > 1) {
      setRegistrationStep(registrationStep - 1);
      setError('');
    }
  };

  const validateCurrentStep = () => {
    switch (registrationStep) {
      case 1:
        if (!firstName || !lastName || !residence || !email || !password || !confirmPassword) {
          setError('Please fill in all fields');
          return false;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          return false;
        }
        return true;
      case 2:
        if (!birthday || !gender || !heightFeet || !heightInches || !weight || !activityLevel) {
          setError('Please fill in all fields');
          return false;
        }
        // Validate birthday is not in the future
        const birthDate = new Date(birthday);
        const today = new Date();
        if (birthDate > today) {
          setError('Birthday cannot be in the future');
          return false;
        }
        // Validate minimum age (13 years old)
        const ageInYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? ageInYears - 1 
          : ageInYears;
        if (actualAge < 13) {
          setError('You must be at least 13 years old to register');
          return false;
        }
        return true;
      case 3:
        if (!dietaryPattern) {
          setError('Please select a dietary pattern');
          return false;
        }
        return true;
      case 4:
        // Step 4 (Allergies & Health) is optional, so always valid
        return true;
      case 5:
        if (!primaryGoal) {
          setError('Please select your primary goal');
          return false;
        }
        return true;
      case 6:
        if (!dataAgreementAccepted) {
          setError('You must accept the data agreement to create an account');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleStepSubmit = (e) => {
    e.preventDefault();
    if (validateCurrentStep()) {
      if (registrationStep < totalSteps) {
        nextStep();
      } else {
        handleFinalSubmit(e);
      }
    }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateCurrentStep()) {
      return;
    }

    setLoading(true);

    try {
      // Calculate age from birthday
      const birthDate = new Date(birthday);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      // Prepare all registration data
      const registrationData = {
        email,
        password,
        firstName,
        lastName,
        residence,
        birthday,
        age: calculatedAge, // Also store calculated age for convenience
        gender,
        height: {
          feet: parseInt(heightFeet),
          inches: parseInt(heightInches)
        },
        weight: parseFloat(weight),
        activityLevel,
        dietaryPattern,
        isKosher,
        isHalal,
        allergies,
        healthConditions,
        primaryGoal
      };

      // Call register with all the data
      const result = await register(
        email,
        password,
        firstName,
        lastName,
        residence,
        registrationData
      );

      if (result.success) {
        navigate('/home');
      } else {
        setError(result.error || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isForgotPassword) {
      // Handle forgot password - request reset token from backend
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      setLoading(true);
      try {
        const response = await fetch('/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to generate reset token');
        }

        // Show success message - email has been sent
        setSuccess('If an account exists with this email, a password reset link has been sent. Please check your inbox and spam folder.');
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccess('');
        }, 8000);
      } catch (err) {
        console.error('Password reset error:', err);
        setError(err.message || 'Failed to generate reset token. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validation for login/signup
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    // Additional validation for signup
    if (!isLogin) {
      if (!firstName || !lastName || !residence) {
        setError('Please fill in all fields');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        // Pass rememberMe to login function
        result = await login(email, password, rememberMe);
        
        // Save email if remember me is checked
        if (result.success && rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else if (result.success && !rememberMe) {
          localStorage.removeItem('rememberedEmail');
        }
      } else {
        // This path should not be reached with multi-step form
        // But keeping as fallback
        result = await register(email, password, firstName, lastName, residence);
      }

      if (result.success) {
        navigate('/home');
      } else {
        setError(result.error || 'Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setResidence('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    // Reset multi-step form
    setRegistrationStep(1);
    setBirthday('');
    setGender('');
    setHeightFeet('');
    setHeightInches('');
    setWeight('');
    setActivityLevel('');
    setDietaryPattern('');
    setIsKosher(false);
    setIsHalal(false);
    setAllergies([]);
    setHealthConditions([]);
    setPrimaryGoal('');
    setDataAgreementAccepted(false);
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-background">
        <div className="auth-blob blob-1"></div>
        <div className="auth-blob blob-2"></div>
        <div className="auth-blob blob-3"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">HUDS Nutrition Analyzer</h1>
          <h2 className="auth-title">
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link'
              : isLogin 
              ? 'Sign in to continue to your dashboard' 
              : registrationStep === 1 
              ? 'Step 1 of 6: Create your account'
              : registrationStep === 2
              ? 'Step 2 of 6: Tell us about yourself'
              : registrationStep === 3
              ? 'Step 3 of 6: Dietary preferences'
              : registrationStep === 4
              ? 'Step 4 of 6: Health & allergies'
              : registrationStep === 5
              ? 'Step 5 of 6: Your goals'
              : 'Step 6 of 6: Data Agreement'}
          </p>
        </div>

        {/* Progress indicator for multi-step registration */}
        {!isLogin && !isForgotPassword && (
          <div className="registration-progress">
            <div className="progress-steps">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => (
                <div
                  key={step}
                  className={`progress-step ${step === registrationStep ? 'active' : ''} ${step < registrationStep ? 'completed' : ''}`}
                >
                  <div className="step-number">{step < registrationStep ? '✓' : step}</div>
                </div>
              ))}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(registrationStep / totalSteps) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        <form className="auth-form" onSubmit={isLogin ? handleSubmit : handleStepSubmit} autoComplete="on">
          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          {success && (
            <div className="auth-success">
              <span className="success-icon">✓</span>
              {success}
            </div>
          )}

          {/* Login Form */}
          {isLogin && !isForgotPassword && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={toggleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? <span className="loading-spinner"></span> : 'Sign In'}
              </button>
            </>
          )}

          {/* Forgot Password Form */}
          {isForgotPassword && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </div>
              <button type="submit" className="auth-button" disabled={loading}>
                {loading ? <span className="loading-spinner"></span> : 'Send Reset Link'}
              </button>
            </>
          )}

          {/* Multi-Step Registration Form */}
          {!isLogin && !isForgotPassword && (
            <>
              {/* Step 1: Basic Info */}
              {registrationStep === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    autoComplete="given-name"
                    disabled={loading}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    autoComplete="family-name"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="residence">Dorm or House</label>
                <select
                  id="residence"
                  name="residence"
                  value={residence}
                  onChange={(e) => setResidence(e.target.value)}
                  disabled={loading}
                  required
                  className="residence-select"
                >
                  <option value="">Select your residence...</option>
                  <optgroup label="Freshman Dorms">
                    {harvardResidences.slice(0, 17).map(res => (
                      <option key={res} value={res}>{res}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Upperclass Houses">
                    {harvardResidences.slice(17).map(res => (
                      <option key={res} value={res}>{res}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@college.harvard.edu"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                        autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
                </>
              )}

              {/* Step 2: Biometric Info */}
              {registrationStep === 2 && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="birthday">Date of Birth</label>
                      <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        max={new Date().toISOString().split('T')[0]} // Cannot be in the future
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="gender">Gender</label>
                      <select
                        id="gender"
                        name="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={loading}
                        required
                        className="residence-select"
                      >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary">Non-binary</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="heightFeet">Height (Feet)</label>
                      <input
                        type="number"
                        id="heightFeet"
                        name="heightFeet"
                        value={heightFeet}
                        onChange={(e) => setHeightFeet(e.target.value)}
                        placeholder="5"
                        min="3"
                        max="8"
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="heightInches">Height (Inches)</label>
                      <input
                        type="number"
                        id="heightInches"
                        name="heightInches"
                        value={heightInches}
                        onChange={(e) => setHeightInches(e.target.value)}
                        placeholder="10"
                        min="0"
                        max="11"
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="weight">Weight (lbs)</label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="150"
                      min="50"
                      max="500"
                      step="0.1"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="activityLevel">Activity Level</label>
                    <select
                      id="activityLevel"
                      name="activityLevel"
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      disabled={loading}
                      required
                      className="residence-select"
                    >
                      <option value="">Select...</option>
                      <option value="sedentary">Sedentary (little or no exercise)</option>
                      <option value="lightly-active">Lightly Active (light exercise 1-3 days/week)</option>
                      <option value="moderately-active">Moderately Active (moderate exercise 3-5 days/week)</option>
                      <option value="very-active">Very Active (hard exercise 6-7 days/week)</option>
                      <option value="extremely-active">Extremely Active (very hard exercise, physical job)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Step 3: Dietary Preferences */}
              {registrationStep === 3 && (
                <>
                  <div className="form-group">
                    <label htmlFor="dietaryPattern">Dietary Pattern</label>
                    <select
                      id="dietaryPattern"
                      name="dietaryPattern"
                      value={dietaryPattern}
                      onChange={(e) => setDietaryPattern(e.target.value)}
                      disabled={loading}
                      required
                      className="residence-select"
                    >
                      <option value="">Select...</option>
                      <option value="omnivore">Omnivore (no restrictions)</option>
                      <option value="vegetarian">Vegetarian (no meat/poultry/fish)</option>
                      <option value="vegan">Vegan (no animal products)</option>
                      <option value="pescatarian">Pescatarian (vegetarian + fish)</option>
                      <option value="flexitarian">Flexitarian (mostly plant-based)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Dietary Requirements (select all that apply)</label>
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isKosher}
                          onChange={(e) => setIsKosher(e.target.checked)}
                          disabled={loading}
                        />
                        <span>I require Kosher meals</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={isHalal}
                          onChange={(e) => setIsHalal(e.target.checked)}
                          disabled={loading}
                        />
                        <span>I require Halal meals</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Step 4: Allergies & Health Conditions */}
              {registrationStep === 4 && (
                <>
                  <div className="form-group">
                    <label>Food Allergies (select all that apply)</label>
                    <div className="checkbox-group">
                      {allergyOptions.map(allergy => (
                        <label key={allergy} className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={allergies.includes(allergy)}
                            onChange={() => handleAllergyToggle(allergy)}
                            disabled={loading}
                          />
                          <span>{allergy}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Health Conditions (select all that apply)</label>
                    <div className="checkbox-group">
                      {healthConditionOptions.map(condition => (
                        <label key={condition} className="checkbox-label">
                <input
                  type="checkbox"
                            checked={healthConditions.includes(condition)}
                            onChange={() => handleHealthConditionToggle(condition)}
                  disabled={loading}
                />
                          <span>{condition}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Step 5: Goals */}
              {registrationStep === 5 && (
                <>
                  <div className="form-group">
                    <label htmlFor="primaryGoal">Primary Goal</label>
                    <select
                      id="primaryGoal"
                      name="primaryGoal"
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      disabled={loading}
                      required
                      className="residence-select"
                    >
                      <option value="">Select...</option>
                      <option value="weight-loss">Weight Loss</option>
                      <option value="weight-gain">Weight Gain</option>
                      <option value="weight-maintenance">Weight Maintenance</option>
                      <option value="muscle-gain">Muscle Gain / Athletic Performance</option>
                      <option value="general-wellness">General Health & Wellness</option>
                      <option value="energy-levels">Improve Energy Levels</option>
                      <option value="better-digestion">Better Digestion / Gut Health</option>
                    </select>
                  </div>
                </>
              )}

              {/* Step 6: Data Agreement */}
              {registrationStep === 6 && (
                <>
                  <div className="form-group" style={{ marginBottom: '0' }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#1a5f3f'
                    }}>
                      Data Agreement & Privacy
                    </h3>
                    <div style={{
                      background: '#f8fcfa',
                      border: '1px solid #d1e7dd',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '16px',
                      fontSize: '14px',
                      lineHeight: '1.7',
                      color: '#1a5f3f'
                    }}>
                      <p style={{ margin: '0 0 16px 0', fontWeight: '600' }}>
                        By creating an account, you acknowledge and consent to the following:
                      </p>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>1. Data We Collect</strong>
                      </p>
                      <p style={{ margin: '0 0 12px 12px' }}>
                        To provide personalized nutrition insights, our application may collect and store the following information:
                      </p>
                      <ul style={{ margin: '0 0 12px 12px', paddingLeft: '20px' }}>
                        <li>Contact information (such as your email address)</li>
                        <li>Profile details (first/last name, residence, age, gender)</li>
                        <li>Biometric information (height, weight)</li>
                        <li>Dietary preferences and restrictions</li>
                        <li>Health conditions relevant to nutrition</li>
                        <li>Meal logs and nutrition tracking data</li>
                        <li>Usage data that helps us improve the app experience</li>
                      </ul>
                      <p style={{ margin: '0 0 16px 12px' }}>
                        We only collect information you choose to provide.
                      </p>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>2. How We Use Your Data</strong>
                      </p>
                      <p style={{ margin: '0 0 12px 12px' }}>
                        Your information is used solely to:
                      </p>
                      <ul style={{ margin: '0 0 12px 12px', paddingLeft: '20px' }}>
                        <li>Generate personalized nutrition targets</li>
                        <li>Provide tailored meal analysis and recommendations</li>
                        <li>Track changes in your progress over time</li>
                        <li>Improve app accuracy, features, and user experience</li>
                      </ul>
                      <p style={{ margin: '0 0 16px 12px' }}>
                        We do not sell, rent, or share your personal data with third parties for advertising.
                      </p>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>3. Data Storage & Security</strong>
                      </p>
                      <p style={{ margin: '0 0 12px 12px' }}>
                        We take your privacy seriously. Your data is:
                      </p>
                      <ul style={{ margin: '0 0 12px 12px', paddingLeft: '20px' }}>
                        <li>Stored securely using industry-standard encryption</li>
                        <li>Protected behind authenticated access controls</li>
                        <li>Transmitted only through secure, encrypted connections</li>
                        <li>Accessible only to you and the authorized services required for app functionality</li>
                      </ul>
                      <p style={{ margin: '0 0 16px 12px' }}>
                        We continuously monitor for vulnerabilities and apply modern security practices.
                      </p>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>4. Your Rights & Control</strong>
                      </p>
                      <p style={{ margin: '0 0 12px 12px' }}>
                        You maintain full ownership and control of your data. You may:
                      </p>
                      <ul style={{ margin: '0 0 12px 12px', paddingLeft: '20px' }}>
                        <li>Access any data stored in your account</li>
                        <li>Update your profile and health information</li>
                        <li>Delete your account and permanently erase your data</li>
                        <li>Withdraw consent for data processing by discontinuing use of the app</li>
                      </ul>
                      <p style={{ margin: '0 0 16px 12px' }}>
                        If you delete your account, all personal data is removed from our systems.
                      </p>
                      <p style={{ margin: '0 0 12px 0' }}>
                        <strong>5. Consent for Sensitive Information</strong>
                      </p>
                      <p style={{ margin: '0 0 16px 12px' }}>
                        Some of the information you provide-such as dietary restrictions or health conditions-may be considered "sensitive data." We collect this only to improve personalization and only with your explicit consent during registration.
                      </p>
                      <p style={{ margin: '0 0 0 0' }}>
                        <strong>6. Medical Disclaimer</strong>
                      </p>
                      <p style={{ margin: '0 0 0 12px' }}>
                        This application provides general nutrition and wellness insights for educational purposes only. It does not provide professional medical advice, diagnosis, or treatment. Always consult a licensed healthcare provider or registered dietitian before making significant changes to your diet or lifestyle.
                      </p>
                    </div>
                    <div style={{
                      background: '#f8fcfa',
                      border: '2px solid #d1e7dd',
                      borderRadius: '8px',
                      padding: '20px',
                      marginBottom: '0'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                        fontSize: '15px',
                        lineHeight: '1.6',
                        color: '#1a5f3f'
                      }}>
                        <input
                          type="checkbox"
                          checked={dataAgreementAccepted}
                          onChange={(e) => setDataAgreementAccepted(e.target.checked)}
                          disabled={loading}
                          required
                          style={{
                            width: '20px',
                            height: '20px',
                            marginTop: '2px',
                            cursor: 'pointer',
                            accentColor: '#1a5f3f',
                            flexShrink: 0
                          }}
                        />
                        <span>
                          I have read and understood the Data Agreement above. I accept the terms and conditions for data collection, usage, and storage. I understand that this app is for educational purposes and does not replace professional medical advice.
                        </span>
              </label>
                    </div>
                  </div>
                </>
              )}

              {/* Navigation Buttons */}
              <div className="form-navigation">
                {registrationStep > 1 && (
              <button
                type="button"
                    className="auth-button secondary"
                    onClick={prevStep}
                disabled={loading}
              >
                    Previous
              </button>
          )}
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
                  ) : registrationStep === totalSteps ? (
                    'Create Account'
            ) : (
                    'Next'
            )}
          </button>
              </div>
            </>
          )}
        </form>

        <div className="auth-footer">
          {!isForgotPassword ? (
            <p>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button 
                type="button"
                className="auth-toggle-button" 
                onClick={toggleMode}
                disabled={loading}
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          ) : (
            <p>
              Remember your password?{' '}
              <button 
                type="button"
                className="auth-toggle-button" 
                onClick={toggleForgotPassword}
                disabled={loading}
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;

