import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  deleteAccount,
} from '../services/profileService';
import './Settings.css';

function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError('');
      try {
        const data = await getUserProfile();
        setProfile(data || {});
      } catch (err) {
        console.error('Failed to load profile', err);
        setProfileError(err.message || 'Failed to load profile.');
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, []);

  const handleProfileUpdated = (updatedProfile) => {
    setProfile(updatedProfile);
  };

  const handleAccountDeleted = () => {
    // After successful account deletion: logout and redirect
    logout();
    navigate('/');
  };

  if (loadingProfile) {
    return (
      <div className="settings-page">
        <h1 className="settings-title">Settings</h1>
        <p>Loading your settings...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="settings-page">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-error">
          {profileError || 'Unable to load profile.'}
        </p>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <h1 className="settings-title">Settings</h1>
      {profileError && <p className="settings-error">{profileError}</p>}

      <div className="settings-grid">
        <ProfileSection profile={profile} onProfileUpdated={handleProfileUpdated} />
        <AcademicSection profile={profile} onProfileUpdated={handleProfileUpdated} />
        <DietHealthSection profile={profile} onProfileUpdated={handleProfileUpdated} />
        <BodyMetricsSection profile={profile} onProfileUpdated={handleProfileUpdated} />
        <SecuritySection
          email={profile.email}
          onPasswordChanged={() => {}}
          onAccountDeleted={handleAccountDeleted}
        />
      </div>
    </div>
  );
}

/**
 * PROFILE SECTION
 * - First name, last name (editable)
 * - Email (read-only)
 */
function ProfileSection({ profile, onProfileUpdated }) {
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setFirstName(profile.firstName || '');
    setLastName(profile.lastName || '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        firstName,
        lastName,
      });
      onProfileUpdated(updatedProfile);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      console.error('Failed to update profile', err);
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Profile</h2>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">First name</label>
          <input
            className="settings-input"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Last name</label>
          <input
            className="settings-input"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Email</label>
          <input
            className="settings-input"
            type="email"
            value={profile.email || ''}
            disabled
          />
          <p className="settings-field-help">
            Email is managed through your account provider and cannot be changed here.
          </p>
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </section>
  );
}

/**
 * ACADEMIC & RESIDENCE
 * - House / residence
 * - Class year
 */
function AcademicSection({ profile, onProfileUpdated }) {
  const [residence, setResidence] = useState(profile.residence || '');
  const [classYear, setClassYear] = useState(profile.classYear || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setResidence(profile.residence || '');
    setClassYear(profile.classYear || '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        residence,
        classYear,
      });
      onProfileUpdated(updatedProfile);
      setSuccess('Academic & residence info updated.');
    } catch (err) {
      console.error('Failed to update academic info', err);
      setError(err.message || 'Failed to update academic info.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Academic & Residence</h2>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">House / residence</label>
          <input
            className="settings-input"
            type="text"
            value={residence}
            onChange={(e) => setResidence(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Class year</label>
          <input
            className="settings-input"
            type="text"
            value={classYear}
            onChange={(e) => setClassYear(e.target.value)}
          />
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

/**
 * DIET & HEALTH
 * - Dietary pattern
 * - Dietary requirements
 * - Allergies
 * - Health conditions
 * For multi-value fields we use comma-separated text for simplicity.
 */
function DietHealthSection({ profile, onProfileUpdated }) {
  const [dietaryPattern, setDietaryPattern] = useState(profile.dietaryPattern || '');
  const [dietaryRequirements, setDietaryRequirements] = useState(
    (profile.dietaryRequirements || []).join(', ')
  );
  const [allergies, setAllergies] = useState((profile.allergies || []).join(', '));
  const [healthConditions, setHealthConditions] = useState(
    (profile.healthConditions || []).join(', ')
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setDietaryPattern(profile.dietaryPattern || '');
    setDietaryRequirements((profile.dietaryRequirements || []).join(', '));
    setAllergies((profile.allergies || []).join(', '));
    setHealthConditions((profile.healthConditions || []).join(', '));
  }, [profile]);

  const toList = (value) =>
    value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        dietaryPattern,
        dietaryRequirements: toList(dietaryRequirements),
        allergies: toList(allergies),
        healthConditions: toList(healthConditions),
      });
      onProfileUpdated(updatedProfile);
      setSuccess('Diet & health info updated.');
    } catch (err) {
      console.error('Failed to update diet & health info', err);
      setError(err.message || 'Failed to update diet & health info.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Diet & Health</h2>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">Dietary pattern</label>
          <input
            className="settings-input"
            type="text"
            placeholder="e.g. omnivore, vegetarian, vegan"
            value={dietaryPattern}
            onChange={(e) => setDietaryPattern(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Dietary requirements</label>
          <textarea
            className="settings-textarea"
            placeholder="Comma-separated (e.g. halal, kosher, gluten-free)"
            value={dietaryRequirements}
            onChange={(e) => setDietaryRequirements(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Food allergies</label>
          <textarea
            className="settings-textarea"
            placeholder="Comma-separated (e.g. peanuts, shellfish)"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Health conditions</label>
          <textarea
            className="settings-textarea"
            placeholder="Comma-separated (e.g. diabetes, celiac disease)"
            value={healthConditions}
            onChange={(e) => setHealthConditions(e.target.value)}
          />
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

/**
 * BODY METRICS
 * - Height
 * - Weight
 */
function BodyMetricsSection({ profile, onProfileUpdated }) {
  const [height, setHeight] = useState(profile.height || '');
  const [weight, setWeight] = useState(profile.weight || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setHeight(profile.height || '');
    setWeight(profile.weight || '');
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Basic numeric validation
    const parsedHeight = height === '' ? null : Number(height);
    const parsedWeight = weight === '' ? null : Number(weight);

    if ((parsedHeight !== null && Number.isNaN(parsedHeight)) ||
        (parsedWeight !== null && Number.isNaN(parsedWeight))) {
      setError('Height and weight must be numbers.');
      setSaving(false);
      return;
    }

    try {
      const updatedProfile = await updateUserProfile({
        height: parsedHeight,
        weight: parsedWeight,
      });
      onProfileUpdated(updatedProfile);
      setSuccess('Body metrics updated.');
    } catch (err) {
      console.error('Failed to update body metrics', err);
      setError(err.message || 'Failed to update body metrics.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="settings-section">
      <h2 className="settings-section-title">Body Metrics</h2>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">Height</label>
          <input
            className="settings-input"
            type="number"
            placeholder="e.g. 170 (cm)"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Weight</label>
          <input
            className="settings-input"
            type="number"
            placeholder="e.g. 65 (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

/**
 * SECURITY
 * - Change password (requires current)
 * - Delete account (requires password confirmation)
 */
function SecuritySection({ email, onAccountDeleted }) {
  return (
    <section className="settings-section settings-section-full">
      <h2 className="settings-section-title">Security</h2>
      <div className="settings-security-grid">
        <ChangePasswordForm email={email} />
        <DeleteAccountPanel email={email} onAccountDeleted={onAccountDeleted} />
      </div>
    </section>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Failed to change password', err);
      setError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-security-card">
      <h3 className="settings-security-title">Change password</h3>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">Current password</label>
          <input
            className="settings-input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">New password</label>
          <input
            className="settings-input"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <div className="settings-field-group">
          <label className="settings-label">Confirm new password</label>
          <input
            className="settings-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button primary"
          disabled={saving}
        >
          {saving ? 'Changing…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}

function DeleteAccountPanel({ onAccountDeleted }) {
  const [password, setPassword] = useState('');
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password) {
      setError('Password is required to delete your account.');
      return;
    }

    if (!confirmChecked) {
      setError('Please confirm that you understand this action is permanent.');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete your account?')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount({ password });
      setSuccess('Account deleted successfully.');
      // Notify parent so it can log out + redirect
      onAccountDeleted();
    } catch (err) {
      console.error('Failed to delete account', err);
      setError(err.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="settings-security-card danger">
      <h3 className="settings-security-title">Delete account</h3>
      <p className="settings-danger-text">
        This will permanently delete your account and associated data. This action
        cannot be undone.
      </p>

      <form onSubmit={handleDelete} className="settings-form">
        <div className="settings-field-group">
          <label className="settings-label">Confirm with password</label>
          <input
            className="settings-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="settings-field-group-inline">
          <input
            id="delete-confirm"
            type="checkbox"
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          <label htmlFor="delete-confirm" className="settings-label-inline">
            I understand this action is permanent and cannot be undone.
          </label>
        </div>

        {error && <p className="settings-error">{error}</p>}
        {success && <p className="settings-success">{success}</p>}

        <button
          type="submit"
          className="settings-button danger"
          disabled={deleting}
        >
          {deleting ? 'Deleting…' : 'Delete account'}
        </button>
      </form>
    </div>
  );
}

export default Settings;
