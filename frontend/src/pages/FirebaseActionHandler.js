import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Auth.css';

const FirebaseActionHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'resetPassword' && oobCode) {
      // Redirect to our custom reset password page with the oobCode
      navigate(`/reset-password?oobCode=${oobCode}`);
    } else {
      // If no valid action, redirect to home
      navigate('/');
    }
  }, [searchParams, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-blobs">
        <div className="blob-1"></div>
        <div className="blob-2"></div>
        <div className="blob-3"></div>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-logo">Harvard Eats</h1>
          <h2 className="auth-title">Redirecting...</h2>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  );
};

export default FirebaseActionHandler;

