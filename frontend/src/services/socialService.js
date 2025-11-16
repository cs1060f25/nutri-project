/**
 * Service for social features API calls
 */

const API_BASE = process.env.REACT_APP_API_BASE || '';

const getAuthHeaders = (accessToken) => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
  };
};

/**
 * Friend request functions
 */
export const sendFriendRequest = async (toUserId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/request`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ toUserId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send friend request');
  }

  return response.json();
};

export const acceptFriendRequest = async (requestId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/accept/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to accept friend request');
  }

  return response.json();
};

export const rejectFriendRequest = async (requestId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/reject/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to reject friend request');
  }

  return response.json();
};

export const getFriendRequests = async (type = 'all', accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/requests?type=${type}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get friend requests');
  }

  return response.json();
};

export const getFriends = async (accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get friends');
  }

  return response.json();
};

export const removeFriend = async (friendId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/${friendId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to remove friend');
  }

  return response.json();
};

/**
 * Post functions
 */
export const createPost = async (mealId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ mealId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create post');
  }

  return response.json();
};

export const getFeedPosts = async (limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/feed?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get feed posts');
  }

  return response.json();
};

export const getPostsByUser = async (userId, limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/user/${userId}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get user posts');
  }

  return response.json();
};

export const getPostsByLocation = async (locationId, limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/location/${locationId}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get location posts');
  }

  return response.json();
};

export const getPostsByLocationName = async (locationName, limit = 50, accessToken) => {
  const encodedName = encodeURIComponent(locationName);
  const response = await fetch(`${API_BASE}/api/social/posts/location-name/${encodedName}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get location posts');
  }

  return response.json();
};

export const deletePost = async (postId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete post');
  }

  return response.json();
};

/**
 * Search functions
 */
export const searchUsers = async (query, limit = 20, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/search/users?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search users');
  }

  return response.json();
};

export const searchLocations = async (query, limit = 20, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/search/locations?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search locations');
  }

  return response.json();
};

/**
 * Dining hall follow functions
 */
export const followDiningHall = async (locationId, locationName, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/dining-halls/follow`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ locationId, locationName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to follow dining hall');
  }

  return response.json();
};

export const unfollowDiningHall = async (locationId, locationName, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/dining-halls/unfollow`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ locationId, locationName }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to unfollow dining hall');
  }

  return response.json();
};

export const getFollowedDiningHalls = async (accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/dining-halls/following`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get followed dining halls');
  }

  return response.json();
};

export const getDiningHallFeedPosts = async (limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/feed/dining-halls?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get dining hall feed posts');
  }

  return response.json();
};

