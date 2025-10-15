import React from 'react';

function Confirmation({ userData }) {
  const { profile, email } = userData;

  const getMotivationalMessage = () => {
    if (profile.activityLevel === 'Sedentary' || profile.activityLevel === 'Light') {
      return "Every journey begins with a single step. You're already on your way! 🌱";
    } else if (profile.stressLevel === 'High' || profile.stressLevel === 'Very High') {
      return "Remember: small, consistent changes make the biggest difference. You've got this! 💚";
    } else if (profile.sleepQuality === 'Poor' || profile.sleepQuality === 'Fair') {
      return "Better nutrition can help improve your sleep. Let's work on this together! 🌙";
    } else {
      return "You're taking control of your health - that's something to be proud of! ✨";
    }
  };

  return (
    <div className="container">
      <div className="icon">🎉</div>
      <h1 className="title">Welcome, {profile.name}!</h1>
      <p className="subtitle">Your wellness profile is ready</p>

      <div className="badge">
        <span>✓</span>
        <span>Profile Complete</span>
      </div>

      <div className="motivation-card">
        <div className="motivation-title">Your Wellness Journey Starts Now</div>
        <div className="motivation-text">{getMotivationalMessage()}</div>
      </div>

      <div className="profile-summary">
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#2E7D32', marginBottom: '16px' }}>
          Your Profile
        </h3>

        <div className="summary-item">
          <span className="summary-label">Email</span>
          <span className="summary-value">{email}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Gender</span>
          <span className="summary-value" style={{ textTransform: 'capitalize' }}>
            {profile.gender}
          </span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Activity Level</span>
          <span className="summary-value">{profile.activityLevel}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Goals</span>
          <span className="summary-value">{profile.dietGoals.join(', ')}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Stress Level</span>
          <span className="summary-value">{profile.stressLevel}</span>
        </div>

        <div className="summary-item">
          <span className="summary-label">Sleep Quality</span>
          <span className="summary-value">{profile.sleepQuality}</span>
        </div>
      </div>

      {(profile.activityLevel === 'Sedentary' || profile.activityLevel === 'Light') && (
        <div style={{
          background: 'linear-gradient(135deg, #FFF9C4 0%, #F0F4C3 100%)',
          padding: '16px',
          borderRadius: '12px',
          marginTop: '20px',
          border: '2px solid #F9FBE7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '18px' }}>💡</span>
            <strong style={{ color: '#558B2F', fontSize: '14px' }}>Tip for Low Activity</strong>
          </div>
          <p style={{ fontSize: '13px', color: '#689F38', margin: 0 }}>
            Start with small changes: take the stairs, walk to class, or try a 10-minute stretch. 
            We'll help you find meals that give you energy without feeling heavy.
          </p>
        </div>
      )}

      <button
        className="button"
        style={{ marginTop: '32px' }}
        onClick={() => alert('Dashboard coming soon! 🎯')}
      >
        View My Dashboard
      </button>

      <div style={{
        marginTop: '24px',
        padding: '20px',
        background: '#E8F5E9',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '14px', color: '#2E7D32', marginBottom: '12px', fontWeight: '500' }}>
          🍎 Next Steps
        </p>
        <p style={{ fontSize: '13px', color: '#66BB6A', lineHeight: '1.6', margin: 0 }}>
          Visit any Harvard dining hall and scan the QR code to see personalized meal recommendations 
          based on your wellness goals. We'll help you make mindful choices, one meal at a time.
        </p>
      </div>

      <p style={{ marginTop: '20px', fontSize: '12px', color: '#A5D6A7', textAlign: 'center' }}>
        Remember: progress, not perfection 💚
      </p>
    </div>
  );
}

export default Confirmation;
