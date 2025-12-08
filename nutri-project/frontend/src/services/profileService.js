/**
 * Service for profile API
 */

/**
 * Get user profile information
 */
export const getProfile = async (accessToken) => {
  const response = await fetch('/api/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch profile');
  }

  return response.json();
};

/**
 * Update user profile information
 */
export const updateProfile = async (profileData, accessToken) => {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update profile');
  }

  return response.json();
};

/**
 * Change user password
 */
export const changePassword = async (currentPassword, newPassword, accessToken) => {
  const response = await fetch('/api/account/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to change password'
    );
  }

  return data;
};

/**
 * Delete user account
 */
export const deleteAccount = async (password, accessToken) => {
  const response = await fetch('/api/account/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      password,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      'Failed to delete account'
    );
  }

  return data;
};
