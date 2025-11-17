// Consolidated Vercel serverless function for ALL social endpoints
const admin = require('firebase-admin');
const axios = require('axios');
const sharp = require('sharp');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const getDb = () => admin.firestore();
const USERS_COLLECTION = 'users';
const FRIEND_REQUESTS_COLLECTION = 'friendRequests';
const FRIENDS_COLLECTION = 'friends';
const POSTS_COLLECTION = 'posts';
const MEALS_SUBCOLLECTION = 'meals';
const DINING_HALL_FOLLOWS_COLLECTION = 'diningHallFollows';

const createErrorResponse = (errorCode, message) => {
  return { error: { code: errorCode, message: message } };
};

// Verify Firebase ID token
const verifyToken = async (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('INVALID_TOKEN');
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    throw new Error('INVALID_TOKEN');
  }
  
  return await admin.auth().verifyIdToken(idToken, true);
};

// ========== PHOTO UPLOAD & COMPRESSION ==========

/**
 * Compress and resize image to fit within Firestore limits
 * @param {string} base64Image - Base64 encoded image (with or without data URI prefix)
 * @param {number} maxSizeKB - Maximum size in KB (default: 750KB to be safe under 1MB Firestore limit)
 * @returns {Promise<string>} - Compressed base64 image data URI
 */
const compressImage = async (base64Image, maxSizeKB = 750) => {
  try {
    // Extract base64 data and mime type
    let base64Data = base64Image;
    let mimeType = 'image/jpeg';
    
    if (base64Image.startsWith('data:')) {
      const matches = base64Image.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1] || 'image/jpeg';
        base64Data = matches[2];
      } else {
        base64Data = base64Image.split(',')[1] || base64Image;
      }
    }
    
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const originalSizeKB = imageBuffer.length / 1024;
    
    console.log(`Original image size: ${originalSizeKB.toFixed(2)} KB`);
    
    // If already small enough, return as-is
    if (originalSizeKB <= maxSizeKB) {
      console.log('Image already within size limit, no compression needed');
      return base64Image.startsWith('data:') ? base64Image : `data:${mimeType};base64,${base64Data}`;
    }
    
    // Get image format and dimensions
    const metadata = await sharp(imageBuffer).metadata();
    const isPng = mimeType.includes('png') || metadata.format === 'png';
    const originalWidth = metadata.width;
    const originalHeight = metadata.height;
    
    // For very large images (>1MB), resize immediately and convert to JPEG for better compression
    // For smaller images, try quality reduction first
    const shouldResizeImmediately = originalSizeKB > 1000;
    
    let compressedBuffer = imageBuffer;
    let currentSizeKB = originalSizeKB;
    
    if (shouldResizeImmediately) {
      // For very large images, resize immediately to speed up compression
      const targetMaxDimension = 1200; // Max width or height
      let width = originalWidth;
      let height = originalHeight;
      
      if (width > height) {
        if (width > targetMaxDimension) {
          height = Math.round((height * targetMaxDimension) / width);
          width = targetMaxDimension;
        }
      } else {
        if (height > targetMaxDimension) {
          width = Math.round((width * targetMaxDimension) / height);
          height = targetMaxDimension;
        }
      }
      
      console.log(`Large image detected (${originalSizeKB.toFixed(2)} KB), resizing immediately from ${originalWidth}x${originalHeight} to ${width}x${height}`);
      
      // Resize and convert to JPEG with moderate quality
      compressedBuffer = await sharp(imageBuffer)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70, mozjpeg: true })
        .toBuffer();
      
      mimeType = 'image/jpeg';
      currentSizeKB = compressedBuffer.length / 1024;
      console.log(`After initial resize: ${currentSizeKB.toFixed(2)} KB`);
      
      // If still too large, reduce quality in one step
      if (currentSizeKB > maxSizeKB) {
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`After quality reduction: ${currentSizeKB.toFixed(2)} KB`);
      }
      
      // If still too large, resize more aggressively
      if (currentSizeKB > maxSizeKB) {
        const ratio = Math.sqrt((maxSizeKB * 0.8) / currentSizeKB);
        width = Math.max(Math.round(width * ratio), 400);
        height = Math.max(Math.round(height * ratio), 300);
        
        console.log(`Further resizing to ${width}x${height}`);
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`Final size: ${currentSizeKB.toFixed(2)} KB`);
      }
    } else {
      // For smaller images, try quality reduction first (faster)
      let quality = isPng ? 70 : 75;
      
      if (isPng) {
        // Convert PNG to JPEG immediately (JPEG compresses much better)
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        mimeType = 'image/jpeg';
      } else {
        compressedBuffer = await sharp(imageBuffer)
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }
      
      currentSizeKB = compressedBuffer.length / 1024;
      console.log(`Compressed with quality ${quality}: ${currentSizeKB.toFixed(2)} KB`);
      
      // If still too large, resize
      if (currentSizeKB > maxSizeKB) {
        const ratio = Math.sqrt((maxSizeKB * 0.9) / currentSizeKB);
        const width = Math.max(Math.round(originalWidth * ratio), 400);
        const height = Math.max(Math.round(originalHeight * ratio), 300);
        
        console.log(`Resizing from ${originalWidth}x${originalHeight} to ${width}x${height}`);
        compressedBuffer = await sharp(imageBuffer)
          .resize(width, height, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 60, mozjpeg: true })
          .toBuffer();
        
        mimeType = 'image/jpeg';
        currentSizeKB = compressedBuffer.length / 1024;
        console.log(`After resize: ${currentSizeKB.toFixed(2)} KB`);
      }
    }
    
    // Convert back to base64
    const compressedBase64 = compressedBuffer.toString('base64');
    const result = `data:${mimeType};base64,${compressedBase64}`;
    
    console.log(`✅ Image compressed from ${originalSizeKB.toFixed(2)} KB to ${currentSizeKB.toFixed(2)} KB`);
    
    return result;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

// Helper functions from services (simplified for serverless)
const sendFriendRequest = async (fromUserId, toUserId) => {
  if (fromUserId === toUserId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const db = getDb();
  const [fromUser, toUser] = await Promise.all([
    db.collection(USERS_COLLECTION).doc(fromUserId).get(),
    db.collection(USERS_COLLECTION).doc(toUserId).get()
  ]);

  if (!fromUser.exists || !toUser.exists) {
    throw new Error('User not found');
  }

  // Check if already friends
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', fromUserId)
    .get();

  for (const doc of friendships.docs) {
    if (doc.data().users.includes(toUserId)) {
      throw new Error('Users are already friends');
    }
  }

  // Check for existing pending request
  const existing = await db
    .collection(FRIEND_REQUESTS_COLLECTION)
    .where('fromUserId', '==', fromUserId)
    .where('toUserId', '==', toUserId)
    .where('status', '==', 'pending')
    .get();

  if (!existing.empty) {
    throw new Error('Friend request already sent');
  }

  const fromUserData = fromUser.data();
  const toUserData = toUser.data();

  const requestRef = await db.collection(FRIEND_REQUESTS_COLLECTION).add({
    fromUserId,
    toUserId,
    fromUserName: `${fromUserData.firstName} ${fromUserData.lastName}`,
    fromUserEmail: fromUserData.email,
    toUserName: `${toUserData.firstName} ${toUserData.lastName}`,
    toUserEmail: toUserData.email,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const requestDoc = await requestRef.get();
  const requestData = requestDoc.data();

  return {
    id: requestDoc.id,
    ...requestData,
    createdAt: requestData.createdAt?.toDate(),
    updatedAt: requestData.updatedAt?.toDate(),
  };
};

const acceptFriendRequest = async (requestId, userId) => {
  const db = getDb();
  const requestRef = db.collection(FRIEND_REQUESTS_COLLECTION).doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const requestData = requestDoc.data();
  if (requestData.toUserId !== userId || requestData.status !== 'pending') {
    throw new Error('Invalid request');
  }

  await requestRef.update({
    status: 'accepted',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await db.collection(FRIENDS_COLLECTION).add({
    users: [requestData.fromUserId, requestData.toUserId].sort(),
    user1Id: requestData.fromUserId,
    user2Id: requestData.toUserId,
    user1Name: requestData.fromUserName,
    user2Name: requestData.toUserName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updatedRequestDoc = await requestRef.get();
  const updatedRequestData = updatedRequestDoc.data();

  return {
    id: updatedRequestDoc.id,
    ...updatedRequestData,
    createdAt: updatedRequestData.createdAt?.toDate(),
    updatedAt: updatedRequestData.updatedAt?.toDate(),
  };
};

const rejectFriendRequest = async (requestId, userId) => {
  const db = getDb();
  const requestRef = db.collection(FRIEND_REQUESTS_COLLECTION).doc(requestId);
  const requestDoc = await requestRef.get();

  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const requestData = requestDoc.data();
  if (requestData.toUserId !== userId || requestData.status !== 'pending') {
    throw new Error('Invalid request');
  }

  await requestRef.update({
    status: 'rejected',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const updatedRequestDoc = await requestRef.get();
  const updatedRequestData = updatedRequestDoc.data();

  return {
    id: updatedRequestDoc.id,
    ...updatedRequestData,
    createdAt: updatedRequestData.createdAt?.toDate(),
    updatedAt: updatedRequestData.updatedAt?.toDate(),
  };
};

const getFriendRequests = async (userId, type = 'all') => {
  const db = getDb();
  let sentSnapshot, receivedSnapshot;

  if (type === 'sent') {
    sentSnapshot = await db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('fromUserId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    receivedSnapshot = { forEach: () => {} };
  } else if (type === 'received') {
    receivedSnapshot = await db
      .collection(FRIEND_REQUESTS_COLLECTION)
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending')
      .get();
    sentSnapshot = { forEach: () => {} };
  } else {
    [sentSnapshot, receivedSnapshot] = await Promise.all([
      db.collection(FRIEND_REQUESTS_COLLECTION)
        .where('fromUserId', '==', userId)
        .where('status', '==', 'pending')
        .get(),
      db.collection(FRIEND_REQUESTS_COLLECTION)
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .get()
    ]);
  }

  const requests = [];
  sentSnapshot.forEach(doc => {
    requests.push({
      id: doc.id,
      ...doc.data(),
      type: 'sent',
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });
  receivedSnapshot.forEach(doc => {
    requests.push({
      id: doc.id,
      ...doc.data(),
      type: 'received',
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
  });

  return requests.sort((a, b) => b.createdAt - a.createdAt);
};

const getFriends = async (userId) => {
  const db = getDb();
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', userId)
    .get();

  const friends = [];
  for (const doc of friendships.docs) {
    const friendship = doc.data();
    const otherUserId = friendship.user1Id === userId ? friendship.user2Id : friendship.user1Id;
    const otherUserName = friendship.user1Id === userId ? friendship.user2Name : friendship.user1Name;

    const userDoc = await db.collection(USERS_COLLECTION).doc(otherUserId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    friends.push({
      id: otherUserId,
      name: otherUserName,
      email: userData?.email || null,
      firstName: userData?.firstName || null,
      lastName: userData?.lastName || null,
      residence: userData?.residence || null,
      friendshipId: doc.id,
      createdAt: friendship.createdAt?.toDate(),
    });
  }

  return friends.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

const removeFriend = async (userId, friendId) => {
  const db = getDb();
  const friendships = await db
    .collection(FRIENDS_COLLECTION)
    .where('users', 'array-contains', userId)
    .get();

  for (const doc of friendships.docs) {
    if (doc.data().users.includes(friendId)) {
      await doc.ref.delete();
      return { success: true, message: 'Friend removed successfully' };
    }
  }

  throw new Error('Friendship not found');
};

const createPost = async (userId, mealId) => {
  const db = getDb();
  const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const mealDoc = await db
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(MEALS_SUBCOLLECTION)
    .doc(mealId)
    .get();

  if (!mealDoc.exists) {
    throw new Error('Meal not found');
  }

  const mealData = mealDoc.data();
  const userData = userDoc.data();

  const post = {
    userId,
    userEmail: userData.email,
    userName: `${userData.firstName} ${userData.lastName}`,
    userFirstName: userData.firstName,
    userLastName: userData.lastName,
    mealId,
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

const getFeedPosts = async (userId, limit = 50) => {
  const db = getDb();
  const friends = await getFriends(userId);
  const friendIds = friends.map(f => f.id);

  if (friendIds.length === 0) {
    return [];
  }

  const allPosts = [];
  for (let i = 0; i < friendIds.length; i += 10) {
    const batch = friendIds.slice(i, i + 10);
    const snapshot = await db
      .collection(POSTS_COLLECTION)
      .where('userId', 'in', batch)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

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

  return allPosts.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
};

const getPostsByUser = async (targetUserId, limit = 50) => {
  const db = getDb();
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const snapshot = await db
    .collection(POSTS_COLLECTION)
    .where('userId', '==', targetUserId)
    .get();

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

const getPostsByLocation = async (locationId, limit = 50) => {
  const db = getDb();
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const snapshot = await db
    .collection(POSTS_COLLECTION)
    .where('locationId', '==', locationId)
    .get();

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

const getPostsByLocationName = async (locationName, limit = 50) => {
  const db = getDb();
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  const snapshot = await db
    .collection(POSTS_COLLECTION)
    .where('locationName', '==', locationName)
    .get();

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

const deletePost = async (userId, postId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  if (postDoc.data().userId !== userId) {
    throw new Error('Unauthorized');
  }

  await postRef.delete();
  return { success: true, message: 'Post deleted successfully' };
};

// Dining hall follow functions
const followDiningHall = async (userId, locationId, locationName) => {
  if (!userId || !locationId || !locationName) {
    throw new Error('userId, locationId, and locationName are required');
  }

  const db = getDb();

  // Check if already following (use both locationId and locationName to uniquely identify)
  const existingFollow = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .where('locationId', '==', locationId)
    .where('locationName', '==', locationName)
    .get();

  if (!existingFollow.empty) {
    throw new Error('Already following this dining hall');
  }

  // Create follow relationship
  const followRef = await db.collection(DINING_HALL_FOLLOWS_COLLECTION).add({
    userId,
    locationId,
    locationName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const followDoc = await followRef.get();
  const followData = followDoc.data();

  return {
    id: followDoc.id,
    ...followData,
    createdAt: followData.createdAt?.toDate(),
  };
};

const unfollowDiningHall = async (userId, locationId, locationName) => {
  const db = getDb();

  // Find the follow relationship (use both locationId and locationName to uniquely identify)
  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .where('locationId', '==', locationId)
    .where('locationName', '==', locationName)
    .get();

  if (follows.empty) {
    throw new Error('Not following this dining hall');
  }

  // Delete all follow relationships (should only be one)
  const deletePromises = follows.docs.map(doc => doc.ref.delete());
  await Promise.all(deletePromises);

  return { success: true, message: 'Unfollowed dining hall successfully' };
};

const getFollowedDiningHalls = async (userId) => {
  const db = getDb();

  const follows = await db
    .collection(DINING_HALL_FOLLOWS_COLLECTION)
    .where('userId', '==', userId)
    .get();

  const diningHalls = [];
  follows.forEach(doc => {
    const data = doc.data();
    diningHalls.push({
      id: doc.id,
      locationId: data.locationId,
      locationName: data.locationName,
      createdAt: data.createdAt?.toDate(),
    });
  });

  return diningHalls.sort((a, b) => a.locationName.localeCompare(b.locationName));
};

const getDiningHallFeedPosts = async (userId, limit = 50) => {
  const db = getDb();

  // Get user's followed dining halls
  const followedHalls = await getFollowedDiningHalls(userId);

  if (followedHalls.length === 0) {
    return [];
  }

  // Get posts from followed dining halls
  // Match by both locationId and locationName to get posts from specific dining halls
  const allPosts = [];

  // For each followed dining hall, get posts matching both locationId and locationName
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  for (const hall of followedHalls) {
    const query = db
      .collection(POSTS_COLLECTION)
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

  // Sort all posts by timestamp descending
  allPosts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle both Vercel's url format and standard format
    const url = req.url || req.path || '';
    // Remove query string
    const pathWithoutQuery = url.split('?')[0];
    
    // Check if this is a photo-upload request (no auth required)
    if (pathWithoutQuery.includes('/photo-upload')) {
      const { image, maxSizeKB } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      try {
        // Compress the image
        const compressedImage = await compressImage(image, maxSizeKB || 750);

        return res.status(200).json({
          success: true,
          compressedImage,
        });
      } catch (error) {
        console.error('Error in photo-upload:', error);
        return res.status(500).json({ 
          error: error.message || 'Failed to compress image'
        });
      }
    }
    
    // Verify authentication for all other endpoints
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Remove /api/social prefix
    let path = pathWithoutQuery.replace(/^\/api\/social/, '');
    // Also handle /api/photo-upload if it somehow gets here
    path = path.replace(/^\/api\/photo-upload/, '/photo-upload');
    // If path is empty, it means we're at the root /api/social
    if (!path || path === '') {
      path = '/';
    }

    // Friend request routes
    if (req.method === 'POST' && path === '/friends/request') {
      const { toUserId } = req.body;
      if (!toUserId) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'toUserId is required'));
      }
      const request = await sendFriendRequest(userId, toUserId);
      return res.status(201).json({ request });
    }

    if (req.method === 'POST' && path.startsWith('/friends/accept/')) {
      const requestId = path.split('/friends/accept/')[1];
      const request = await acceptFriendRequest(requestId, userId);
      return res.status(200).json({ request, message: 'Friend request accepted' });
    }

    if (req.method === 'POST' && path.startsWith('/friends/reject/')) {
      const requestId = path.split('/friends/reject/')[1];
      const request = await rejectFriendRequest(requestId, userId);
      return res.status(200).json({ request, message: 'Friend request rejected' });
    }

    if (req.method === 'GET' && path === '/friends/requests') {
      const type = req.query.type || 'all';
      const requests = await getFriendRequests(userId, type);
      return res.status(200).json({ requests });
    }

    if (req.method === 'GET' && path === '/friends') {
      const friends = await getFriends(userId);
      return res.status(200).json({ friends });
    }

    if (req.method === 'DELETE' && path.startsWith('/friends/')) {
      const friendId = path.split('/friends/')[1];
      const result = await removeFriend(userId, friendId);
      return res.status(200).json(result);
    }

    // Post routes
    if (req.method === 'POST' && path === '/posts') {
      const { mealId } = req.body;
      if (!mealId) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'mealId is required'));
      }
      const post = await createPost(userId, mealId);
      return res.status(201).json({ post, message: 'Post created successfully' });
    }

    if (req.method === 'GET' && path === '/posts/feed') {
      const limit = parseInt(req.query.limit || 50, 10);
      const posts = await getFeedPosts(userId, limit);
      return res.status(200).json({ posts, count: posts.length });
    }

    if (req.method === 'GET' && path.startsWith('/posts/user/')) {
      const targetUserId = path.split('/posts/user/')[1].split('?')[0];
      const limit = parseInt(req.query.limit || 50, 10);
      const posts = await getPostsByUser(targetUserId, limit);
      return res.status(200).json({ posts, count: posts.length });
    }

    if (req.method === 'GET' && path.startsWith('/posts/location/')) {
      const locationId = path.split('/posts/location/')[1].split('?')[0];
      const limit = parseInt(req.query.limit || 50, 10);
      const posts = await getPostsByLocation(locationId, limit);
      return res.status(200).json({ posts, count: posts.length });
    }

    if (req.method === 'GET' && path.startsWith('/posts/location-name/')) {
      const locationName = decodeURIComponent(path.split('/posts/location-name/')[1].split('?')[0]);
      const limit = parseInt(req.query.limit || 50, 10);
      const posts = await getPostsByLocationName(locationName, limit);
      return res.status(200).json({ posts, count: posts.length });
    }

    if (req.method === 'DELETE' && path.startsWith('/posts/')) {
      const postId = path.split('/posts/')[1];
      const result = await deletePost(userId, postId);
      return res.status(200).json(result);
    }

    // Search routes
    if (req.method === 'GET' && path === '/search/users') {
      const q = req.query.q;
      if (!q || q.trim().length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Search query is required'));
      }

      const searchTerm = q.trim().toLowerCase();
      const db = getDb();
      
      // Step 1: Get all valid users from Firebase Auth first
      // This ensures we only include users that actually exist in Auth (not deleted)
      // Wrap in try-catch to handle potential timeouts or errors on Vercel
      let validAuthUserIds = new Set();
      try {
        const authUsersResult = await admin.auth().listUsers(1000); // Get up to 1000 users
        authUsersResult.users.forEach(user => {
          validAuthUserIds.add(user.uid);
        });
      } catch (authError) {
        console.error('Error fetching users from Firebase Auth, falling back to Firestore-only filter:', authError);
        // If listUsers fails (e.g., timeout), we'll just filter by email presence
        // This is a fallback - not ideal but prevents the function from crashing
      }

      // Step 2: Get all users from Firestore and filter by search term
      // Only include users that exist in Firebase Auth (not deleted)
      const snapshot = await db.collection(USERS_COLLECTION).get();
      const matchingUsers = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        
        // Only include users that:
        // 1. Have an email (required field for valid users)
        // 2. Still exist in Firebase Auth (not deleted) - if we successfully got the list
        if (!userData || !userData.email) {
          return;
        }
        
        // If we have validAuthUserIds (from successful listUsers call), check it
        // Otherwise, just check for email (fallback mode)
        if (validAuthUserIds.size > 0 && !validAuthUserIds.has(userId)) {
          return;
        }

        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.toLowerCase();
        const email = (userData.email || '').toLowerCase();
        const residence = (userData.residence || '').toLowerCase();

        if (fullName.includes(searchTerm) || email.includes(searchTerm) || residence.includes(searchTerm)) {
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

      const limit = parseInt(req.query.limit || 20, 10);
      return res.status(200).json({ users: matchingUsers.slice(0, limit), count: matchingUsers.length });
    }

    if (req.method === 'GET' && path === '/search/locations') {
      const q = req.query.q || '';
      console.log('Search locations query:', q);
      
      // Get all locations from HUDS API
      const HUDS_BASE_URL = process.env.HUDS_API_BASE_URL || 'https://go.prod.apis.huit.harvard.edu/ats/dining/v3';
      const HUDS_API_KEY = process.env.HUDS_API_KEY;
      
      let hudsLocations = [];
      try {
        const response = await axios.get(`${HUDS_BASE_URL}/locations`, {
          headers: {
            'X-Api-Key': HUDS_API_KEY,
            'Accept': 'application/json',
          },
        });
        hudsLocations = response.data || [];
      } catch (error) {
        console.error('Error fetching HUDS locations:', error);
        // Fallback to empty array if HUDS API fails
        hudsLocations = [];
      }
      
      // Helper to normalize house names (same as backend)
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

      // Helper to generate a unique ID from location name
      const generateUniqueId = (locationName) => {
        // Create a simple hash from the location name
        let hash = 0;
        const str = locationName.toLowerCase().trim();
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        // Return positive hash with prefix to ensure uniqueness
        return `loc-${Math.abs(hash)}-${str.replace(/\s+/g, '-')}`;
      };

      // Expand locations that contain multiple houses (same logic as backend)
      // Use a Map to ensure each house name appears only once with a unique ID
      const locationMap = new Map();
      
      hudsLocations.forEach(loc => {
        const locationName = loc.location_name;
        
        if (locationName && locationName.includes(' and ')) {
          const houses = locationName.split(' and ').map(h => h.trim());
          houses.forEach(house => {
            const normalizedName = normalizeHouseName(house);
            // Generate unique ID based on normalized name
            const uniqueId = generateUniqueId(normalizedName);
            
            // Only add if we haven't seen this exact house name before
            if (!locationMap.has(normalizedName.toLowerCase())) {
              locationMap.set(normalizedName.toLowerCase(), {
                location_number: loc.location_number,
                location_name: normalizedName,
                original_name: locationName,
                uniqueId: uniqueId
              });
            }
          });
        } else {
          const normalizedName = normalizeHouseName(locationName);
          // Generate unique ID based on normalized name
          const uniqueId = generateUniqueId(normalizedName);
          
          // Only add if we haven't seen this exact house name before
          if (!locationMap.has(normalizedName.toLowerCase())) {
            locationMap.set(normalizedName.toLowerCase(), {
              location_number: loc.location_number,
              location_name: normalizedName,
              original_name: locationName,
              uniqueId: uniqueId
            });
          }
        }
      });

      // Convert map to array
      const expandedLocations = Array.from(locationMap.values());

      // Filter by search query if provided
      let filteredLocations = expandedLocations;
      if (q && q.trim().length > 0) {
        const searchTerm = q.trim().toLowerCase();
        console.log('Filtering with search term:', searchTerm);
        console.log('Expanded locations before filter:', expandedLocations.map(l => l.location_name));
        
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
          const matches = mainWords.some(word => word.startsWith(searchTerm));
          console.log(`Location "${loc.location_name}": mainWords=[${mainWords.join(', ')}], matches=${matches}`);
          return matches;
        });
        
        console.log('Filtered locations after filter:', filteredLocations.map(l => l.location_name));
      }

      // Get post counts for each location
      const postsSnapshot = await getDb().collection(POSTS_COLLECTION).get();
      
      const postCountMap = new Map();
      postsSnapshot.forEach(doc => {
        const postData = doc.data();
        const locationId = postData.locationId;
        const locationName = postData.locationName;
        
        // Match by location number or name
        const key = `${locationId}|${locationName}`;
        postCountMap.set(key, (postCountMap.get(key) || 0) + 1);
      });

      // Build response with post counts
      // Use a Map to deduplicate by location name (case-insensitive)
      const uniqueLocationsMap = new Map();
      
      filteredLocations.forEach(loc => {
        const locationNameKey = loc.location_name.toLowerCase();
        
        // Only keep the first occurrence of each location name
        if (!uniqueLocationsMap.has(locationNameKey)) {
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
          
          uniqueLocationsMap.set(locationNameKey, {
            locationId: loc.location_number, // Keep original for API compatibility
            locationName: loc.location_name,
            postCount: postCount,
            uniqueId: loc.uniqueId // Use this for React keys
          });
        }
      });
      
      const locations = Array.from(uniqueLocationsMap.values());

      const limit = parseInt(req.query.limit || 20, 10);
      return res.status(200).json({ locations: locations.slice(0, limit), count: locations.length });
    }

    // Dining hall follow routes
    if (req.method === 'POST' && path === '/dining-halls/follow') {
      const { locationId, locationName } = req.body;
      if (!locationId || !locationName) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'locationId and locationName are required'));
      }
      const follow = await followDiningHall(userId, locationId, locationName);
      return res.status(201).json({ follow, message: 'Dining hall followed successfully' });
    }

    if (req.method === 'POST' && path === '/dining-halls/unfollow') {
      const { locationId, locationName } = req.body;
      if (!locationId || !locationName) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'locationId and locationName are required'));
      }
      const result = await unfollowDiningHall(userId, locationId, locationName);
      return res.status(200).json(result);
    }

    if (req.method === 'GET' && path === '/dining-halls/following') {
      const diningHalls = await getFollowedDiningHalls(userId);
      return res.status(200).json({ diningHalls, count: diningHalls.length });
    }

    if (req.method === 'GET' && path === '/posts/feed/dining-halls') {
      const limit = parseInt(req.query.limit || 50, 10);
      const posts = await getDiningHallFeedPosts(userId, limit);
      return res.status(200).json({ posts, count: posts.length });
    }

    return res.status(404).json(createErrorResponse('NOT_FOUND', 'Endpoint not found'));

  } catch (error) {
    console.error('Social API error:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(400).json(createErrorResponse('ERROR', error.message || 'Failed to process request.'));
  }
};

