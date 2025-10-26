import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
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
  const { login, register } = useAuth();
  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (isForgotPassword) {
      // Handle forgot password using Firebase client SDK
      if (!email) {
        setError('Please enter your email address');
        return;
      }

      setLoading(true);
      try {
        // Configure the action code settings to use our custom reset page
        const actionCodeSettings = {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: false,
        };
        
        await sendPasswordResetEmail(auth, email, actionCodeSettings);
        setSuccess('Password reset email sent! Check your inbox and spam folder.');
        setTimeout(() => {
          setIsForgotPassword(false);
          setSuccess('');
        }, 5000);
      } catch (err) {
        console.error('Password reset error:', err);
        if (err.code === 'auth/user-not-found') {
          setError('No account found with this email address.');
        } else if (err.code === 'auth/invalid-email') {
          setError('Invalid email address.');
        } else {
          setError('Failed to send reset email. Please try again.');
        }
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
  };

  const toggleForgotPassword = () => {
    setIsForgotPassword(!isForgotPassword);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
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
              : 'Join us to start your nutrition journey'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
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

          {!isLogin && !isForgotPassword && (
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
            </>
          )}

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

          {!isForgotPassword && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                disabled={loading}
                required
              />
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="form-options">
              <label className="remember-me" title="Stay logged in on this device">
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
          )}

          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner"></span>
            ) : isForgotPassword ? (
              'Send Reset Link'
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
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

