/**
 * Service for managing posts (shared meals) in Firestore
 */

const { admin } = require('../config/firebase');

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';

const getDb = () => admin.firestore();

/**
 * Create a post from a meal
 */
const createPost = async (userId, mealId, mealData) => {
  const db = getDb();

  // Get user info
  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();

  const post = {
    userId,
    userEmail: userData.email,
    userName: `${userData.firstName} ${userData.lastName}`,
    userFirstName: userData.firstName,
    userLastName: userData.lastName,
    mealId, // Reference to the original meal
    mealDate: mealData.mealDate,
    mealType: mealData.mealType,
    mealName: mealData.mealName || mealData.mealType,
    locationId: mealData.locationId,
    locationName: mealData.locationName,
    items: mealData.items,
    totals: mealData.totals,
    timestamp: mealData.timestamp || admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const postRef = await db.collection(POSTS_COLLECTION).add(post);
  const postDoc = await postRef.get();
  const postData = postDoc.data();

  return {
    id: postDoc.id,
    ...postData,
    timestamp: postData.timestamp?.toDate(),
    createdAt: postData.createdAt?.toDate(),
    updatedAt: postData.updatedAt?.toDate(),
  };
};

/**
 * Get feed posts (posts from friends)
 */
const getFeedPosts = async (userId, limit = 50) => {
  const db = getDb();

  // Get user's friends
  const { getFriends } = require('./friendService');
  const friends = await getFriends(userId);
  const friendIds = friends.map(f => f.id);

  if (friendIds.length === 0) {
    return [];
  }

  // Get posts from friends
  const postsRef = db.collection(POSTS_COLLECTION);
  let query = postsRef.where('userId', 'in', friendIds.slice(0, 10)); // Firestore 'in' limit is 10

  // If more than 10 friends, we need to batch queries
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const allPosts = [];
  
  for (let i = 0; i < friendIds.length; i += 10) {
    const batch = friendIds.slice(i, i + 10);
    const batchQuery = postsRef
      .where('userId', 'in', batch);
    
    const snapshot = await batchQuery.get();
    snapshot.forEach(doc => {
      allPosts.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });
  }

  // Sort all posts by timestamp descending (with fallback to createdAt)
  allPosts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

/**
 * Get feed posts from followed dining halls
 */
const getDiningHallFeedPosts = async (userId, limit = 50) => {
  const db = getDb();

  // Get user's followed dining halls
  const { getFollowedDiningHalls } = require('./diningHallFollowService');
  const followedHalls = await getFollowedDiningHalls(userId);

  if (followedHalls.length === 0) {
    return [];
  }

  // Get posts from followed dining halls
  // Match by both locationId and locationName to get posts from specific dining halls
  const postsRef = db.collection(POSTS_COLLECTION);
  const allPosts = [];

  // For each followed dining hall, get posts matching both locationId and locationName
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  for (const hall of followedHalls) {
    const query = postsRef
      .where('locationId', '==', hall.locationId)
      .where('locationName', '==', hall.locationName);
    
    const snapshot = await query.get();
    snapshot.forEach(doc => {
      allPosts.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
    });
  }

  // Sort all posts by timestamp descending (with fallback to createdAt)
  allPosts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

/**
 * Get posts by a specific user
 */
const getPostsByUser = async (userId, targetUserId, limit = 50) => {
  const db = getDb();

  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const query = db
    .collection(POSTS_COLLECTION)
    .where('userId', '==', targetUserId);

  const snapshot = await query.get();
  const posts = [];

  snapshot.forEach(doc => {
    posts.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  // Sort by timestamp descending in-memory
  posts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return posts.slice(0, limit);
};

/**
 * Get posts by dining hall location
 */
const getPostsByLocation = async (locationId, limit = 50) => {
  const db = getDb();

  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const query = db
    .collection(POSTS_COLLECTION)
    .where('locationId', '==', locationId);

  const snapshot = await query.get();
  const posts = [];

  snapshot.forEach(doc => {
    posts.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  // Sort by timestamp descending in-memory
  posts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return posts.slice(0, limit);
};

/**
 * Get posts by location name (for search)
 */
const getPostsByLocationName = async (locationName, limit = 50) => {
  const db = getDb();

  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const query = db
    .collection(POSTS_COLLECTION)
    .where('locationName', '==', locationName);

  const snapshot = await query.get();
  const posts = [];

  snapshot.forEach(doc => {
    posts.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  // Sort by timestamp descending in-memory
  posts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return posts.slice(0, limit);
};

/**
 * Delete a post
 */
const deletePost = async (userId, postId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();

  // Verify ownership
  if (postData.userId !== userId) {
    throw new Error('Unauthorized: You can only delete your own posts');
  }

  await postRef.delete();

  return { success: true, message: 'Post deleted successfully' };
};

module.exports = {
  createPost,
  getFeedPosts,
  getDiningHallFeedPosts,
  getPostsByUser,
  getPostsByLocation,
  getPostsByLocationName,
  deletePost,
};

