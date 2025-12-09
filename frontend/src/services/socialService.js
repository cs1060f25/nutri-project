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

// Helper to handle API errors with better error messages
const handleApiError = async (response, defaultMessage) => {
  if (!response.ok) {
    let errorMessage = defaultMessage || `HTTP error! status: ${response.status}`;
    // Clone the response so we can read it multiple times if needed
    const responseClone = response.clone();
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.error || errorData.message || errorMessage;
    } catch (jsonError) {
      // If response is not JSON, try to get text from the clone
      try {
        const text = await responseClone.text();
        // Check if it's HTML (like a 404 page)
        if (text.trim().startsWith('<!')) {
          errorMessage = `API endpoint not found (${response.status}). Check if the route is configured correctly.`;
        } else if (text) {
          errorMessage = text;
        }
      } catch (textError) {
        // If all else fails, use status-based message
        console.error('Failed to parse error response:', textError);
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
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

  return handleApiError(response, 'Failed to send friend request');
};

export const acceptFriendRequest = async (requestId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/accept/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to accept friend request');
};

export const rejectFriendRequest = async (requestId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/reject/${requestId}`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to reject friend request');
};

export const getFriendRequests = async (type = 'all', accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/requests?type=${type}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get friend requests');
};

export const getFriends = async (accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get friends');
};

export const removeFriend = async (friendId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/friends/${friendId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to remove friend');
};

export const getNotifications = async (accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/notifications`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get notifications');
};

/** 
 * Post functions
 */
export const createPost = async (mealId, accessToken, isPublic = true, displayOptions = null) => {
  const body = { mealId, isPublic };
  if (displayOptions) {
    body.displayOptions = displayOptions;
  }
  
  const response = await fetch(`${API_BASE}/api/social/posts`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(body),
  });

  return handleApiError(response, 'Failed to create post');
};

export const createPostFromScan = async (scanData, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/scan`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(scanData),
  });

  return handleApiError(response, 'Failed to create post from scan');
};

export const getFeedPosts = async (limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/feed?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get feed posts');
};

export const getPostsByUser = async (userId, limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/user/${userId}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get user posts');
};

export const getPostsByLocation = async (locationId, limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/location/${locationId}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get location posts');
};

export const getPostsByLocationName = async (locationName, limit = 50, accessToken) => {
  const encodedName = encodeURIComponent(locationName);
  const response = await fetch(`${API_BASE}/api/social/posts/location-name/${encodedName}?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get location posts');
};

export const updatePost = async (postId, updateData, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/${postId}`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify(updateData),
  });

  return handleApiError(response, 'Failed to update post');
};

export const deletePost = async (postId, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/${postId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to delete post');
};

/**
 * Search functions
 */
export const searchUsers = async (query, limit = 20, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/search/users?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to search users');
};

export const searchLocations = async (query, limit = 20, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/search/locations?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to search locations');
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

  return handleApiError(response, 'Failed to follow dining hall');
};

export const unfollowDiningHall = async (locationId, locationName, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/dining-halls/unfollow`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken),
    body: JSON.stringify({ locationId, locationName }),
  });

  return handleApiError(response, 'Failed to unfollow dining hall');
};

export const getFollowedDiningHalls = async (accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/dining-halls/following`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get followed dining halls');
};

export const getDiningHallFeedPosts = async (limit = 50, accessToken) => {
  const response = await fetch(`${API_BASE}/api/social/posts/feed/dining-halls?limit=${limit}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get dining hall feed posts');
};

export const getPopularPosts = async (limit = 50, accessToken, options = {}) => {
  const { timeWindowHours, locationName, mealType } = options;
  const params = new URLSearchParams({ limit: limit.toString() });
  
  if (timeWindowHours) {
    params.append('timeWindowHours', timeWindowHours.toString());
  }
  if (locationName) {
    params.append('locationName', locationName);
  }
  if (mealType) {
    params.append('mealType', mealType);
  }

  const response = await fetch(`${API_BASE}/api/social/posts/popular?${params.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(accessToken),
  });

  return handleApiError(response, 'Failed to get popular posts');
};
