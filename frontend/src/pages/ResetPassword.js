import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Auth.css';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  useEffect(() => {
    // Get token and email from URL params or sessionStorage
    const tokenFromUrl = searchParams.get('token');
    const emailFromUrl = searchParams.get('email');
    const tokenFromStorage = sessionStorage.getItem('resetToken');
    const emailFromStorage = sessionStorage.getItem('resetEmail');

    const token = tokenFromUrl || tokenFromStorage;
    const userEmail = emailFromUrl || emailFromStorage;

    if (!token || !userEmail) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      setVerifying(false);
      return;
    }

    setResetToken(token);
    setEmail(userEmail);
    setVerifying(false);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!resetToken || !email) {
      setError('Missing reset token or email. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/auth/confirm-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          resetToken: resetToken,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to reset password');
      }

      // Clear session storage
      sessionStorage.removeItem('resetToken');
      sessionStorage.removeItem('resetEmail');

      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
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
            <h2 className="auth-title">Verifying Reset Token...</h2>
          </div>
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !email) {
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
            <h2 className="auth-title">Reset Password</h2>
          </div>

          <div className="error-message">{error}</div>

          <button
            className="auth-button secondary"
            onClick={() => navigate('/')}
            style={{ marginTop: '20px' }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

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
          <h2 className="auth-title">Reset Password</h2>
          {email && (
            <p className="auth-subtitle" style={{ marginTop: '10px', color: '#64748b' }}>
              for {email}
            </p>
          )}
        </div>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              className="auth-button secondary"
              onClick={() => navigate('/')}
              disabled={loading}
              style={{ flex: 1 }}
            >
              Back to Login
            </button>
            <button
              type="submit"
              className="auth-button"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

