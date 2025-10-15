import React, { useState } from 'react';

function SignUp({ onComplete }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!email.endsWith('@college.harvard.edu')) {
      setError('Please use your Harvard College email');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    // Mock API call with localStorage
    setTimeout(() => {
      const users = JSON.parse(localStorage.getItem('wellnessUsers') || '[]');
      const existingUser = users.find(u => u.email === email);

      if (existingUser) {
        setError('Account already exists');
        setLoading(false);
        return;
      }

      const newUser = {
        id: Date.now().toString(),
        email,
        password,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem('wellnessUsers', JSON.stringify(users));

      onComplete(newUser.id, email);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="container">
      <div className="icon">🌱</div>
      <h1 className="title">Welcome to CrimsonFuel</h1>
      <p className="subtitle">Your wellness journey starts here</p>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email" className="label">Harvard Email</label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.name@college.harvard.edu"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirm-password" className="label">Confirm Password</label>
          <input
            id="confirm-password"
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            disabled={loading}
          />
        </div>

        <button type="submit" className="button" disabled={loading}>
          {loading ? 'Creating Account...' : 'Get Started'}
        </button>
      </form>

      <p style={{ marginTop: '24px', fontSize: '13px', color: '#81C784', textAlign: 'center' }}>
        Take small steps toward a healthier you 💚
      </p>
    </div>
  );
}

export default SignUp;
