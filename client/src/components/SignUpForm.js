import React, { useState } from 'react';
import axios from 'axios';

function SignUpForm({ onComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.endsWith('@college.harvard.edu')) {
      setError('Please use your Harvard College email (@college.harvard.edu)');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/api/auth/signup', {
        email,
        password,
      });

      if (response.data.success) {
        onComplete(response.data.userId, email);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '16px' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }} role="img" aria-label="Apple icon">
            🍎
          </div>
          <h1 className="title">CrimsonFuel</h1>
          <p className="subtitle">Harvard Nutrition Tracker</p>
        </div>

        <h2 className="section-title">Create Your Account</h2>

        {error && (
          <div className="alert alert-error" role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Harvard Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.name@college.harvard.edu"
              required
              aria-required="true"
              aria-describedby="email-help"
              autoComplete="email"
            />
            <span id="email-help" className="sr-only">
              Enter your Harvard College email address
            </span>
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              aria-required="true"
              aria-describedby="password-help"
              autoComplete="new-password"
            />
            <span id="password-help" style={{ fontSize: '13px', color: '#8E8E93', marginTop: '4px', display: 'block' }}>
              Minimum 8 characters
            </span>
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password" className="input-label">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              aria-required="true"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="button"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '24px', fontSize: '13px', color: '#8E8E93', textAlign: 'center' }}>
          By signing up, you agree to track your nutrition and manage dietary restrictions.
        </p>
      </div>
    </div>
  );
}

export default SignUpForm;
