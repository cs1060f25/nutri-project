import React from 'react';

function SuccessScreen({ userData }) {
  const { profile, email } = userData;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', padding: '16px' }}>
      <div className="card" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '24px' }} role="img" aria-label="Success checkmark">
          ✅
        </div>

        <h1 className="title" style={{ fontSize: '34px' }}>Welcome, {profile.name}!</h1>
        <p className="subtitle">Your account is all set up</p>

        <div
          className="alert alert-success"
          role="status"
          aria-live="polite"
          style={{ textAlign: 'left', marginTop: '32px' }}
        >
          <strong>Account Created Successfully!</strong>
          <br />
          You can now start tracking your nutrition.
        </div>

        <div style={{ marginTop: '32px', textAlign: 'left' }}>
          <h2 className="section-title" style={{ fontSize: '20px' }}>Your Profile</h2>
          
          <div style={{ background: '#F2F2F7', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8E8E93', fontSize: '15px' }}>Email</span>
              <span style={{ fontWeight: '500', fontSize: '15px' }}>{email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8E8E93', fontSize: '15px' }}>Gender</span>
              <span style={{ fontWeight: '500', fontSize: '15px', textTransform: 'capitalize' }}>{profile.gender}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8E8E93', fontSize: '15px' }}>Gluten-Free</span>
              <span style={{ fontWeight: '500', fontSize: '15px' }}>{profile.glutenFree ? '✓ Yes' : 'No'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ color: '#8E8E93', fontSize: '15px' }}>Activity Level</span>
              <span style={{ fontWeight: '500', fontSize: '15px', textTransform: 'capitalize' }}>
                {profile.activityLevel.replace('-', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#8E8E93', fontSize: '15px' }}>Goal</span>
              <span style={{ fontWeight: '500', fontSize: '15px', textTransform: 'capitalize' }}>
                {profile.dietGoal.replace('-', ' ')}
              </span>
            </div>
          </div>

          {profile.foodPreferences && (
            <div style={{ background: '#F2F2F7', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ color: '#8E8E93', fontSize: '13px', marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
                Food Preferences
              </div>
              <div style={{ fontSize: '15px' }}>
                {profile.foodPreferences || 'None specified'}
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: '32px', padding: '24px', background: 'rgba(0, 122, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }} role="img" aria-label="QR code scanner">
            📱
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Next Step: Scan Your Meals</h3>
          <p style={{ fontSize: '15px', color: '#8E8E93', marginBottom: '16px' }}>
            Visit any Harvard dining hall and use our QR code scanner to log your meals instantly.
            {profile.glutenFree && " We'll highlight gluten-free options for you!"}
          </p>
          <button className="button" style={{ marginTop: '16px' }}>
            Go to Dashboard
          </button>
        </div>

        <p style={{ marginTop: '24px', fontSize: '13px', color: '#8E8E93' }}>
          Need help? Visit our support page or email support@crimsonfuel.harvard.edu
        </p>
      </div>
    </div>
  );
}

export default SuccessScreen;
