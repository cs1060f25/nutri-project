import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
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
  const totalSteps = 3; // Step 1 is landing page, steps 2-4 are the actual 3 steps

  // Additional registration fields
  const [birthday, setBirthday] = useState('');
  const [classYear, setClassYear] = useState('');
  const [gender, setGender] = useState('');
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [weight, setWeight] = useState('');
  const [dietaryPattern, setDietaryPattern] = useState('');
  const [isKosher, setIsKosher] = useState(false);
  const [isHalal, setIsHalal] = useState(false);
  const [allergies, setAllergies] = useState([]);
  const [healthConditions, setHealthConditions] = useState([]);
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
    // Step 1 is landing page, steps 2-4 are the actual 3 steps
    const maxStep = totalSteps + 1; // 4 (1 landing + 3 steps: 2=account, 3=biometric, 4=dietary+agreement)
    if (registrationStep < maxStep) {
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

  const validateCurrentStep = async () => {
    switch (registrationStep) {
      case 1:
        // Intro page - always allow to proceed
        return true;
      case 2:
        if (!firstName || !lastName || !email || !password || !confirmPassword || !classYear || !residence) {
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
        // Check if email already exists
        try {
          const response = await fetch(`/auth/check-email?email=${encodeURIComponent(email)}`);
          const data = await response.json();
          if (data.exists) {
            setError('An account with this email already exists. Please sign in instead.');
            return false;
          }
        } catch (error) {
          console.error('Error checking email:', error);
          // Don't block registration if check fails, but log it
        }
        return true;
      case 3:
        if (!birthday || !gender || !heightFeet || !heightInches || !weight) {
          setError('Please fill in all fields');
          return false;
        }
        // Validate birthday is not in the future and user is at least 16 years old
        const birthDate = new Date(birthday);
        const today = new Date();
        if (birthDate > today) {
          setError('Birthday cannot be in the future');
          return false;
        }
        // Validate minimum age (16 years old)
        const ageInYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
          ? ageInYears - 1 
          : ageInYears;
        if (actualAge < 16) {
          setError('You must be at least 16 years old to register');
          return false;
        }
        return true;
      case 4:
        if (!dietaryPattern) {
          setError('Please select a dietary pattern');
          return false;
        }
        if (!dataAgreementAccepted) {
          setError('You must accept the data agreement to create an account');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleStepSubmit = async (e) => {
    e.preventDefault();
    const isValid = await validateCurrentStep();
    if (isValid) {
      // Step 1 is landing page, steps 2-4 are the actual 3 steps
      const maxStep = totalSteps + 1; // 4 (1 landing + 3 steps: 2=account, 3=biometric, 4=dietary+agreement)
      if (registrationStep < maxStep) {
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
        classYear,
        gender,
        height: {
          feet: parseInt(heightFeet),
          inches: parseInt(heightInches)
        },
        weight: parseFloat(weight),
        dietaryPattern,
        isKosher,
        isHalal,
        allergies,
        healthConditions
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
    setClassYear('');
    setGender('');
    setHeightFeet('');
    setHeightInches('');
    setWeight('');
    setDietaryPattern('');
    setIsKosher(false);
    setIsHalal(false);
    setAllergies([]);
    setHealthConditions([]);
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
            {isForgotPassword ? 'Reset Password' : isLogin ? 'Welcome Back' : registrationStep === 1 ? 'Welome to our app!' : 'Create Account'}
          </h2>
          <p className="auth-subtitle">
            {isForgotPassword 
              ? 'Enter your email to receive a password reset link'
              : isLogin 
              ? 'Sign in to continue to your dashboard' 
              : registrationStep === 1 
              ? 'Create Account'
              : registrationStep === 2
              ? 'Step 1 of 3: Create your account'
              : registrationStep === 3
              ? 'Step 2 of 3: Biometric Data'
              : 'Step 3 of 3: Dietary preferences & health'}
          </p>
        </div>

        {/* Progress indicator for multi-step registration */}
        {!isLogin && !isForgotPassword && registrationStep > 1 && (
          <div className="registration-progress">
            <div className="progress-steps">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(step => {
                // Map step 1-5 to registrationStep 2-6 (step 1 is landing page)
                const actualStep = step + 1;
                return (
                  <div
                    key={step}
                    className={`progress-step ${actualStep === registrationStep ? 'active' : ''} ${actualStep < registrationStep ? 'completed' : ''}`}
                  >
                    <div className="step-number">{actualStep < registrationStep ? '✓' : step}</div>
                  </div>
                );
              })}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((registrationStep - 1) / totalSteps) * 100}%` }}
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
              {/* Step 1: Welcome/Intro */}
              {registrationStep === 1 && (
                <div className="registration-intro">
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}> 
                    <p style={{ fontSize: '1rem', color: '#475569', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
                      Track your dining hall meals, monitor your nutrition goals, and get personalized recommendations based on Harvard University Dining Services menus.
                    </p>
                    <div style={{ background: '#f0f9f4', padding: '1.5rem', borderRadius: '12px', maxWidth: '600px', margin: '0 auto', marginBottom: '0' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#1a5f3f', marginBottom: '0.75rem', marginTop: 0 }}>
                        Your Data is Private & Secure
                      </h4>
                      <p style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', margin: 0 }}>
                        All information you provide is kept private and secure. Your data is only used to make calculations, estimates, and recommendations within the app.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Basic Info */}
              {registrationStep === 2 && (
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="classYear">Class Year</label>
              <CustomSelect
                value={classYear}
                onChange={setClassYear}
                options={[
                  { value: '', label: 'Select...' },
                  { value: '2025', label: '2025' },
                  { value: '2026', label: '2026' },
                  { value: '2027', label: '2027' },
                  { value: '2028', label: '2028' },
                  { value: '2029', label: '2029' },
                  { value: '2030', label: '2030' },
                  { value: '2031', label: '2031' },
                  { value: '2032', label: '2032' },
                ]}
                placeholder="Select..."
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label htmlFor="residence">Dorm or House</label>
              <CustomSelect
                value={residence}
                onChange={setResidence}
                options={[
                  { value: '', label: 'Select...' },
                  ...harvardResidences.map(res => ({
                    value: res,
                    label: res
                  }))
                ]}
                placeholder="Select..."
                disabled={loading}
                className="residence-select"
              />
            </div>
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

              {/* Step 3: Biometric Info */}
              {registrationStep === 3 && (
                <>
                  <div style={{ 
                    background: '#f0f9f4', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    color: '#475569',
                    lineHeight: '1.5'
                  }}>
                    This information is used to recommend personalized meal plans based on your biometric data.
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="birthday">Date of Birth</label>
                      <input
                        type="date"
                        id="birthday"
                        name="birthday"
                        value={birthday}
                        onChange={(e) => setBirthday(e.target.value)}
                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 16)).toISOString().split('T')[0]} // Must be at least 16 years old
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="gender">Gender</label>
                      <CustomSelect
                        value={gender}
                        onChange={setGender}
                        options={[
                          { value: '', label: 'Select...' },
                          { value: 'male', label: 'Male' },
                          { value: 'female', label: 'Female' },
                          { value: 'non-binary', label: 'Non-binary' },
                          { value: 'prefer-not-to-say', label: 'Prefer not to say' },
                        ]}
                        placeholder="Select..."
                        disabled={loading}
                      />
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

                </>
              )}

              {/* Step 4: Dietary Preferences & Health */}
              {registrationStep === 4 && (
                <>
                  <div style={{ 
                    background: '#f0f9f4', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    marginBottom: '.5rem',
                    fontSize: '0.875rem',
                    color: '#475569',
                    lineHeight: '1.5'
                  }}>
                    This information is used to recommend personalized meal plans based on your biometric data.
                  </div>
                  <div className="form-group">
                    <label htmlFor="dietaryPattern">Dietary Pattern</label>
                    <CustomSelect
                      value={dietaryPattern}
                      onChange={setDietaryPattern}
                      options={[
                        { value: '', label: 'Select...' },
                        { value: 'omnivore', label: 'Omnivore' },
                        { value: 'vegetarian', label: 'Vegetarian' },
                        { value: 'vegan', label: 'Vegan' },
                        { value: 'pescatarian', label: 'Pescatarian' },
                      ]}
                      placeholder="Select..."
                      disabled={loading}
                      className="residence-select"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dietary Requirements (select all that apply)</label>
                    <div className="chip-group">
                      <button
                        type="button"
                        className={`chip ${isKosher ? 'chip-selected' : ''}`}
                        onClick={() => setIsKosher(!isKosher)}
                        disabled={loading}
                      >
                        <span className="chip-icon">{isKosher ? '×' : '+'}</span>
                        <span>I require Kosher meals</span>
                      </button>
                      <button
                        type="button"
                        className={`chip ${isHalal ? 'chip-selected' : ''}`}
                        onClick={() => setIsHalal(!isHalal)}
                        disabled={loading}
                      >
                        <span className="chip-icon">{isHalal ? '×' : '+'}</span>
                        <span>I require Halal meals</span>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Food Allergies (select all that apply)</label>
                    <div className="chip-group">
                      {allergyOptions.map(allergy => {
                        const isSelected = allergies.includes(allergy);
                        return (
                          <button
                            key={allergy}
                            type="button"
                            className={`chip ${isSelected ? 'chip-selected' : ''}`}
                            onClick={() => handleAllergyToggle(allergy)}
                            disabled={loading}
                          >
                            <span className="chip-icon">{isSelected ? '×' : '+'}</span>
                            <span>{allergy}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Health Conditions (select all that apply)</label>
                    <div className="chip-group">
                      {healthConditionOptions.map(condition => {
                        const isSelected = healthConditions.includes(condition);
                        return (
                          <button
                            key={condition}
                            type="button"
                            className={`chip ${isSelected ? 'chip-selected' : ''}`}
                            onClick={() => handleHealthConditionToggle(condition)}
                            disabled={loading}
                          >
                            <span className="chip-icon">{isSelected ? '×' : '+'}</span>
                            <span>{condition}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: 'calc(24px - 2rem)', marginBottom: '0.5rem' }}>
                    <div style={{ 
                      background: '#f0f9f4', 
                      padding: '0', 
                      borderRadius: '8px', 
                      marginBottom: '0',
                      fontSize: '0.875rem',
                      color: '#475569',
                      lineHeight: '1.5'
                    }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: '#475569',
                        margin: 0,
                        padding: '1rem'
                      }}>
                        <input
                          type="checkbox"
                          checked={dataAgreementAccepted}
                          onChange={(e) => setDataAgreementAccepted(e.target.checked)}
                          disabled={loading}
                          required
                          style={{
                            width: '18px',
                            height: '18px',
                            marginTop: '2px',
                            cursor: 'pointer',
                            accentColor: '#1a5f3f',
                            flexShrink: 0
                          }}
                        />
                        <span>
                          I agree to the collection and use of my data for personalized nutrition recommendations. This app is for educational purposes and does not replace professional medical advice.
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
                  ) : registrationStep === totalSteps + 1 ? (
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

