/**
 * Controller for social features: friends and posts
 */

const friendService = require('../services/friendService');
const postService = require('../services/postService');
const mealLogService = require('../services/mealLogService');
const diningHallFollowService = require('../services/diningHallFollowService');
const hudsService = require('../services/hudsService');
const { createErrorResponse } = require('../utils/errorMapper');
const { admin } = require('../config/firebase');

/**
 * POST /api/social/friends/request
 * Send a friend request
 */
const sendFriendRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'toUserId is required')
      );
    }

    const request = await friendService.sendFriendRequest(userId, toUserId);
    return res.status(201).json({ request });
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(400).json(
      createErrorResponse('FRIEND_REQUEST_ERROR', error.message)
    );
  }
};

/**
 * POST /api/social/friends/accept/:requestId
 * Accept a friend request
 */
const acceptFriendRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;

    const request = await friendService.acceptFriendRequest(requestId, userId);
    return res.status(200).json({ request, message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    return res.status(400).json(
      createErrorResponse('FRIEND_REQUEST_ERROR', error.message)
    );
  }
};

/**
 * POST /api/social/friends/reject/:requestId
 * Reject a friend request
 */
const rejectFriendRequest = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { requestId } = req.params;

    const request = await friendService.rejectFriendRequest(requestId, userId);
    return res.status(200).json({ request, message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    return res.status(400).json(
      createErrorResponse('FRIEND_REQUEST_ERROR', error.message)
    );
  }
};

/**
 * GET /api/social/friends/requests
 * Get friend requests (sent, received, or all)
 */
const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { type = 'all' } = req.query;

    if (!['all', 'sent', 'received'].includes(type)) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'type must be all, sent, or received')
      );
    }

    const requests = await friendService.getFriendRequests(userId, type);
    return res.status(200).json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get friend requests')
    );
  }
};

/**
 * GET /api/social/friends
 * Get all friends
 */
const getFriends = async (req, res) => {
  try {
    const userId = req.user.uid;
    const friends = await friendService.getFriends(userId);
    return res.status(200).json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get friends')
    );
  }
};

/**
 * DELETE /api/social/friends/:friendId
 * Remove a friend
 */
const removeFriend = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { friendId } = req.params;

    const result = await friendService.removeFriend(userId, friendId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(400).json(
      createErrorResponse('FRIEND_ERROR', error.message)
    );
  }
};

/**
 * POST /api/social/posts
 * Create a post from a meal
 */
const createPost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { mealId } = req.body;

    if (!mealId) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'mealId is required')
      );
    }

    // Get the meal
    const meal = await mealLogService.getMealLogById(userId, mealId);

    // Create post from meal
    const post = await postService.createPost(userId, mealId, meal);
    return res.status(201).json({ post, message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(400).json(
      createErrorResponse('POST_ERROR', error.message)
    );
  }
};

/**
 * GET /api/social/posts/feed
 * Get feed posts (from friends)
 */
const getFeedPosts = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50 } = req.query;

    const posts = await postService.getFeedPosts(userId, parseInt(limit, 10));
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get feed posts error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get feed posts')
    );
  }
};

/**
 * GET /api/social/posts/feed/dining-halls
 * Get feed posts from followed dining halls
 */
const getDiningHallFeedPosts = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50 } = req.query;

    const posts = await postService.getDiningHallFeedPosts(userId, parseInt(limit, 10));
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get dining hall feed posts error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get dining hall feed posts')
    );
  }
};

/**
 * GET /api/social/posts/user/:userId
 * Get posts by a specific user
 */
const getPostsByUser = async (req, res) => {
  try {
    const currentUserId = req.user.uid;
    const { userId: targetUserId } = req.params;
    const { limit = 50 } = req.query;

    const posts = await postService.getPostsByUser(
      currentUserId,
      targetUserId,
      parseInt(limit, 10)
    );
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get posts by user error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get user posts')
    );
  }
};

/**
 * GET /api/social/posts/location/:locationId
 * Get posts by dining hall location
 */
const getPostsByLocation = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { limit = 50 } = req.query;

    const posts = await postService.getPostsByLocation(
      locationId,
      parseInt(limit, 10)
    );
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get posts by location error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get location posts')
    );
  }
};

/**
 * GET /api/social/posts/location-name/:locationName
 * Get posts by location name
 */
const getPostsByLocationName = async (req, res) => {
  try {
    const { locationName } = req.params;
    const { limit = 50 } = req.query;

    const posts = await postService.getPostsByLocationName(
      decodeURIComponent(locationName),
      parseInt(limit, 10)
    );
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get posts by location name error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get location posts')
    );
  }
};

/**
 * DELETE /api/social/posts/:postId
 * Delete a post
 */
const deletePost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { postId } = req.params;

    const result = await postService.deletePost(userId, postId);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(400).json(
      createErrorResponse('POST_ERROR', error.message)
    );
  }
};

/**
 * GET /api/social/search/users
 * Search for users
 */
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'Search query is required')
      );
    }

    const searchTerm = q.trim().toLowerCase();
    const db = admin.firestore();
    const usersRef = db.collection('users');

    // Get all users (Firestore doesn't support full-text search, so we'll filter client-side)
    // In production, you might want to use Algolia or similar for better search
    const snapshot = await usersRef.get();
    const matchingUsers = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.toLowerCase();
      const email = (userData.email || '').toLowerCase();
      const residence = (userData.residence || '').toLowerCase();

      if (
        fullName.includes(searchTerm) ||
        email.includes(searchTerm) ||
        residence.includes(searchTerm)
      ) {
        matchingUsers.push({
          id: doc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          residence: userData.residence,
          name: `${userData.firstName} ${userData.lastName}`,
        });
      }
    });

    // Limit results
    const limit = parseInt(req.query.limit || 20, 10);
    return res.status(200).json({
      users: matchingUsers.slice(0, limit),
      count: matchingUsers.length,
    });
  } catch (error) {
    console.error('Search users error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to search users')
    );
  }
};

/**
 * POST /api/social/dining-halls/follow
 * Follow a dining hall
 */
const followDiningHall = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { locationId, locationName } = req.body;

    if (!locationId || !locationName) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'locationId and locationName are required')
      );
    }

    const follow = await diningHallFollowService.followDiningHall(userId, locationId, locationName);
    return res.status(201).json({ follow, message: 'Dining hall followed successfully' });
  } catch (error) {
    console.error('Follow dining hall error:', error);
    return res.status(400).json(
      createErrorResponse('DINING_HALL_ERROR', error.message)
    );
  }
};

/**
 * POST /api/social/dining-halls/unfollow
 * Unfollow a dining hall
 */
const unfollowDiningHall = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { locationId, locationName } = req.body;

    if (!locationId || !locationName) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'locationId and locationName are required')
      );
    }

    const result = await diningHallFollowService.unfollowDiningHall(userId, locationId, locationName);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Unfollow dining hall error:', error);
    return res.status(400).json(
      createErrorResponse('DINING_HALL_ERROR', error.message)
    );
  }
};

/**
 * GET /api/social/dining-halls/following
 * Get all dining halls user is following
 */
const getFollowedDiningHalls = async (req, res) => {
  try {
    const userId = req.user.uid;
    const diningHalls = await diningHallFollowService.getFollowedDiningHalls(userId);
    return res.status(200).json({ diningHalls, count: diningHalls.length });
  } catch (error) {
    console.error('Get followed dining halls error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get followed dining halls')
    );
  }
};

/**
 * GET /api/social/search/locations
 * Search for dining hall locations using HUDS API locations
 */
const searchLocations = async (req, res) => {
  try {
    const { q } = req.query;

    // Get all locations from HUDS API
    const hudsLocations = await hudsService.getLocations();
    
    // Helper to normalize house names (same as frontend)
    const normalizeHouseName = (houseName) => {
      const trimmed = houseName.trim();
      const baseName = trimmed.replace(/\s+House\s*$/i, '').trim();
      const ALL_HOUSES = [
        'Pforzheimer', 'Cabot', 'Currier', 'Kirkland', 'Leverett', 'Lowell',
        'Eliot', 'Adams', 'Mather', 'Dunster', 'Winthrop', 'Quincy'
      ];
      const isHouse = ALL_HOUSES.some(base => 
        base.toLowerCase() === baseName.toLowerCase()
      );
      if (isHouse && !trimmed.endsWith('House')) {
        return `${trimmed} House`;
      }
      return trimmed;
    };

    // Expand locations that contain multiple houses (same logic as frontend)
    const expandedLocations = [];
    hudsLocations.forEach(loc => {
      const locationName = loc.location_name;
      
      if (locationName.includes(' and ')) {
        const houses = locationName.split(' and ').map(h => h.trim());
        houses.forEach(house => {
          expandedLocations.push({
            location_number: loc.location_number,
            location_name: normalizeHouseName(house),
            original_name: locationName
          });
        });
      } else {
        expandedLocations.push({
          location_number: loc.location_number,
          location_name: normalizeHouseName(locationName),
          original_name: locationName
        });
      }
    });

    // Filter by search query if provided
    let filteredLocations = expandedLocations;
    if (q && q.trim().length > 0) {
      const searchTerm = q.trim().toLowerCase();
      filteredLocations = expandedLocations.filter(loc => 
        loc.location_name.toLowerCase().includes(searchTerm) ||
        loc.original_name.toLowerCase().includes(searchTerm)
      );
    }

    // Get post counts for each location
    const db = admin.firestore();
    const postsRef = db.collection('posts');
    const postsSnapshot = await postsRef.get();
    
    const postCountMap = new Map();
    postsSnapshot.forEach(doc => {
      const postData = doc.data();
      const locationId = postData.locationId;
      const locationName = postData.locationName;
      
      // Match by location number or name
      const key = `${postData.locationId}|${postData.locationName}`;
      postCountMap.set(key, (postCountMap.get(key) || 0) + 1);
    });

    // Build response with post counts
    const locations = filteredLocations.map(loc => {
      // Try to match posts by location number or name
      let postCount = 0;
      for (const [key, count] of postCountMap.entries()) {
        const [postLocationId, postLocationName] = key.split('|');
        if (postLocationId === loc.location_number || 
            postLocationName === loc.location_name ||
            postLocationName === loc.original_name) {
          postCount += count;
        }
      }

      return {
        locationId: loc.location_number,
        locationName: loc.location_name,
        originalName: loc.original_name,
        postCount,
      };
    });

    const limit = parseInt(req.query.limit || 20, 10);

    return res.status(200).json({
      locations: locations.slice(0, limit),
      count: locations.length,
    });
  } catch (error) {
    console.error('Search locations error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to search locations')
    );
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  createPost,
  getFeedPosts,
  getDiningHallFeedPosts,
  getPostsByUser,
  getPostsByLocation,
  getPostsByLocationName,
  deletePost,
  followDiningHall,
  unfollowDiningHall,
  getFollowedDiningHalls,
  searchUsers,
  searchLocations,
};

