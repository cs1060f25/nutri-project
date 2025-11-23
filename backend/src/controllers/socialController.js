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
    const { mealId, isPublic, displayOptions } = req.body;

    if (!mealId) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'mealId is required')
      );
    }

    // Get the meal
    const meal = await mealLogService.getMealLogById(userId, mealId);

    // Create post from meal with optional visibility and display options
    const post = await postService.createPost(userId, mealId, meal, isPublic, displayOptions);
    return res.status(201).json({ post, message: 'Post created successfully' });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(400).json(
      createErrorResponse('POST_ERROR', error.message)
    );
  }
};

/**
 * POST /api/social/posts/scan
 * Create a post from a scan (image analysis)
 */
const createPostFromScan = async (req, res) => {
  try {
    console.log('=== CREATE POST FROM SCAN START ===');
    console.log('Request body keys:', Object.keys(req.body || {}));
    console.log('Request body size:', JSON.stringify(req.body || {}).length);
    console.log('User ID:', req.user?.uid);
    
    if (!req.user || !req.user.uid) {
      console.error('No user in request - auth middleware may have failed');
      return res.status(401).json(
        createErrorResponse('INVALID_TOKEN', 'Authentication required')
      );
    }
    
    const userId = req.user.uid;
    const {
      image,
      locationId,
      locationName,
      mealDate,
      mealType,
      rating,
      review: rawReview,
      matchedItems,
      unmatchedDishes,
      nutritionTotals,
      timestamp
    } = req.body;

    // Safely handle review - can be null, undefined, or string
    const review = (typeof rawReview === 'string' && rawReview.trim().length > 0)
      ? rawReview.trim()
      : null;

    console.log('Create post from scan request:', {
      userId,
      hasImage: !!image,
      imageSize: image ? image.length : 0,
      locationId,
      locationName,
      mealDate,
      mealType,
      rating,
      hasReview: !!review,
      matchedItemsCount: matchedItems?.length || 0,
      unmatchedDishesCount: unmatchedDishes?.length || 0
    });

    // Validate required fields
    if (!locationId) {
      console.error('Missing locationId in request');
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'locationId is required')
      );
    }

    if (!locationName) {
      console.error('Missing locationName in request');
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'locationName is required')
      );
    }

    if (!rating || rating < 1 || rating > 5) {
      console.error('Invalid rating:', rating);
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'rating must be between 1 and 5')
      );
    }

    // Ensure locationId is a string
    const locationIdStr = String(locationId).trim();
    if (!locationIdStr) {
      return res.status(400).json(
        createErrorResponse('INVALID_REQUEST', 'locationId cannot be empty')
      );
    }

    // Handle image - compress and store in Firestore
    let processedImage = null;
    if (image && typeof image === 'string') {
      try {
        console.log('Compressing image, original size:', image.length, 'bytes');
        const { compressImage } = require('../utils/imageCompression');
        // Compress image to fit within Firestore limits (400KB max)
        processedImage = await compressImage(image, 400);
        console.log('✅ Image compressed successfully, new size:', processedImage.length, 'bytes');
      } catch (error) {
        console.error('❌ Failed to compress image:', error);
        console.error('Error details:', error.message, error.stack);
        // Continue without image rather than failing the entire request
        processedImage = null;
      }
    } else {
      console.log('No image provided in request');
    }

    // Create post from scan data
    console.log('Calling postService.createPostFromScan with:', {
      userId,
      hasImage: !!processedImage,
      imageSize: processedImage ? processedImage.length : 0,
      locationId: locationIdStr,
      locationName,
      mealDate: mealDate || new Date().toISOString().split('T')[0],
      mealType,
      rating,
      hasReview: !!review,
      matchedItemsCount: matchedItems?.length || 0
    });

    try {
      const post = await postService.createPostFromScan(userId, {
        image: processedImage, // Compressed base64 image
        locationId: locationIdStr,
        locationName,
        mealDate: mealDate || new Date().toISOString().split('T')[0],
        mealType: mealType || null,
        rating,
        review: review,
        matchedItems: matchedItems || [],
        unmatchedDishes: unmatchedDishes || [],
        nutritionTotals: nutritionTotals || {},
        timestamp: timestamp || new Date().toISOString()
      });

      console.log('=== POST CREATED SUCCESSFULLY ===');
      console.log('Post data:', {
        id: post.id,
        hasImage: !!post.image,
        imageSize: post.image ? post.image.length : 0
      });
      return res.status(201).json({ post, message: 'Post created successfully' });
    } catch (serviceError) {
      console.error('Error in postService.createPostFromScan:', serviceError);
      console.error('Service error stack:', serviceError.stack);
      throw serviceError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('=== CREATE POST FROM SCAN ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5)
    });
    
    // Ensure we always return a proper error response
    const statusCode = error.message?.includes('not found') ? 404 : 500;
    const errorMessage = error.message || 'Failed to create post from scan';
    
    console.error('Returning error response:', { statusCode, errorMessage });
    
    return res.status(statusCode).json(
      createErrorResponse('POST_ERROR', errorMessage)
    );
  }
};

/**
 * GET /api/social/posts/feed
 * Get feed posts (from friends and own posts)
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
 * GET /api/social/posts/popular
 * Get popular posts (all public posts sorted by upvotes)
 */
const getPopularPosts = async (req, res) => {
  try {
    const { limit = 50, timeWindowHours, locationName, mealType } = req.query;

    const options = {};
    if (timeWindowHours) {
      options.timeWindowHours = parseInt(timeWindowHours, 10);
    }
    if (locationName) {
      options.locationName = locationName;
    }
    if (mealType) {
      options.mealType = mealType;
    }

    const posts = await postService.getPopularPosts(parseInt(limit, 10), options);
    return res.status(200).json({ posts, count: posts.length });
  } catch (error) {
    console.error('Get popular posts error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get popular posts')
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
 * PUT /api/social/posts/:postId
 * Update a post
 */
const updatePost = async (req, res) => {
  try {
    const userId = req.user.uid;
    const { postId } = req.params;
    const updateData = { ...req.body };

    // Handle image compression if a new image is provided (base64 data)
    if (updateData.image && typeof updateData.image === 'string') {
      try {
        const { compressImage } = require('../utils/imageCompression');
        // Compress image to fit within Firestore limits (400KB max)
        updateData.image = await compressImage(updateData.image, 400);
        console.log('✅ Image compressed for update, size:', updateData.image.length, 'bytes');
      } catch (error) {
        console.error('❌ Failed to compress image:', error);
        // Continue without image rather than failing the entire request
        delete updateData.image;
      }
    }

    const post = await postService.updatePost(userId, postId, updateData);
    return res.status(200).json({ post, message: 'Post updated successfully' });
  } catch (error) {
    console.error('Update post error:', error);
    const statusCode = error.message?.includes('not found') ? 404 : 
                       error.message?.includes('Unauthorized') ? 403 : 400;
    return res.status(statusCode).json(
      createErrorResponse('POST_ERROR', error.message)
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

    // Step 1: Get all valid users from Firebase Auth first
    // This ensures we only include users that actually exist in Auth (not deleted)
    const authUsersResult = await admin.auth().listUsers(1000); // Get up to 1000 users
    const validAuthUserIds = new Set();
    authUsersResult.users.forEach(user => {
      validAuthUserIds.add(user.uid);
    });

    // Step 2: Get all users from Firestore and filter by search term
    // Only include users that exist in Firebase Auth (not deleted)
    const snapshot = await usersRef.get();
    const matchingUsers = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Only include users that:
      // 1. Have an email (required field for valid users)
      // 2. Still exist in Firebase Auth (not deleted)
      if (!userData || !userData.email || !validAuthUserIds.has(userId)) {
        return;
      }

      // Exclude the current user from search results
      if (req.user && req.user.uid === userId) {
        return;
      }

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
      filteredLocations = expandedLocations.filter(loc => {
        // Only match against the specific location name, not the original combined name
        // This ensures "dunster" only matches "Dunster House", not "Mather House"
        const locationNameLower = loc.location_name.toLowerCase();
        
        // Split into words and check if search term matches the start of any main word
        // (excluding "house", "hall", etc.)
        const nameWords = locationNameLower.split(/\s+/);
        const mainWords = nameWords.filter(word => !['house', 'hall', 'and'].includes(word));
        
        // Check if search term matches the beginning of any main word
        // This ensures "dunster" matches "Dunster House" but not "Mather House"
        // Only match if the search term starts a word (not just appears anywhere)
        return mainWords.some(word => word.startsWith(searchTerm));
      });
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

/**
 * GET /api/social/posts/:postId
 * Get a single post by ID
 */
const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;

    const post = await postService.getPostById(userId, postId);
    if (!post) {
      return res.status(404).json(
        createErrorResponse('NOT_FOUND', 'Post not found')
      );
    }
    return res.status(200).json({ post });
  } catch (error) {
    console.error('Get post by ID error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get post')
    );
  }
};

/**
 * POST /api/social/posts/:postId/upvote
 * Toggle upvote on a post
 */
const upvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;

    await postService.toggleUpvote(postId, userId);
    return res.status(200).json({ message: 'Upvote toggled successfully' });
  } catch (error) {
    console.error('Upvote post error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to upvote post')
    );
  }
};

/**
 * POST /api/social/posts/:postId/downvote
 * Toggle downvote on a post
 */
const downvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;

    await postService.toggleDownvote(postId, userId);
    return res.status(200).json({ message: 'Downvote toggled successfully' });
  } catch (error) {
    console.error('Downvote post error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to downvote post')
    );
  }
};

/**
 * GET /api/social/posts/:postId/comments
 * Get comments for a post
 */
const getComments = async (req, res) => {
  try {
    const { postId } = req.params;

    const comments = await postService.getComments(postId);
    return res.status(200).json({ comments, count: comments.length });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to get comments')
    );
  }
};

/**
 * POST /api/social/posts/:postId/comments
 * Add a comment to a post
 */
const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.uid;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json(
        createErrorResponse('INVALID_INPUT', 'Comment text is required')
      );
    }

    const newComment = await postService.addComment(postId, userId, comment.trim());
    return res.status(201).json({ comment: newComment, message: 'Comment added successfully' });
  } catch (error) {
    console.error('Add comment error:', error);
    return res.status(500).json(
      createErrorResponse('INTERNAL', 'Failed to add comment')
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
  createPostFromScan,
  getFeedPosts,
  getDiningHallFeedPosts,
  getPopularPosts,
  getPostsByUser,
  getPostsByLocation,
  getPostsByLocationName,
  updatePost,
  deletePost,
  getPostById,
  upvotePost,
  downvotePost,
  getComments,
  addComment,
  followDiningHall,
  unfollowDiningHall,
  getFollowedDiningHalls,
  searchUsers,
  searchLocations,
};

