import React from 'react';

function ConfirmationPage({ userData }) {
  return (
    <div className="confirmation-container">
      <div className="success-icon">✓</div>
      
      <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#323130' }}>
        Welcome, {userData.name}!
      </h1>
      
      <p style={{ fontSize: '16px', color: '#605e5c', marginBottom: '24px' }}>
        Your allergy-aware profile is ready
      </p>

      <div className="safety-badge">
        <span style={{ fontSize: '20px' }}>🛡️</span>
        <span>Safety Verified Profile</span>
      </div>

      <div className="profile-summary">
        <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#323130' }}>
          Profile Summary
        </h2>
        
        <div className="summary-item">
          <span className="summary-label">Name</span>
          <span className="summary-value">{userData.name}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Allergies</span>
          <span className="summary-value">
            {userData.allergies.length > 0 
              ? userData.allergies.join(', ') 
              : 'None'}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Diet Goal</span>
          <span className="summary-value">{userData.dietGoal}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Activity Level</span>
          <span className="summary-value">{userData.activityLevel}</span>
        </div>
      </div>

      {userData.allergies.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          padding: '16px',
          borderRadius: '12px',
          marginTop: '24px',
          border: '2px solid #fbbf24'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <strong style={{ color: '#92400e' }}>Allergy Alert Active</strong>
          </div>
          <p style={{ fontSize: '14px', color: '#78350f', margin: 0 }}>
            We'll automatically filter out {userData.allergies.join(', ')} from your meal recommendations.
          </p>
        </div>
      )}

      <button
        style={{
          marginTop: '32px',
          padding: '14px 32px',
          background: 'linear-gradient(135deg, #0078d4 0%, #00bcf2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '24px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
      >
        Go to Dashboard
      </button>

      <p style={{ fontSize: '13px', color: '#a19f9d', marginTop: '24px' }}>
        Your data is encrypted and secure. We take allergy safety seriously.
      </p>
    </div>
  );
}

export default ConfirmationPage;
