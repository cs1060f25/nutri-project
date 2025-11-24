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

  // Parse totals and normalize field names (handle fat/totalFat, carbs/totalCarbs/totalCarb)
  const parseNutrient = (value) => {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  console.log('Creating post from meal log - mealData.totals:', JSON.stringify(mealData.totals));
  
  const totals = mealData.totals ? {
    calories: parseNutrient(mealData.totals.calories),
    protein: parseNutrient(mealData.totals.protein),
    totalCarbs: parseNutrient(mealData.totals.totalCarbs || mealData.totals.totalCarb || mealData.totals.carbs),
    totalFat: parseNutrient(mealData.totals.totalFat || mealData.totals.fat),
    saturatedFat: parseNutrient(mealData.totals.saturatedFat),
    transFat: parseNutrient(mealData.totals.transFat),
    cholesterol: parseNutrient(mealData.totals.cholesterol),
    sodium: parseNutrient(mealData.totals.sodium),
    dietaryFiber: parseNutrient(mealData.totals.dietaryFiber),
    sugars: parseNutrient(mealData.totals.sugars),
  } : null;
  
  console.log('Parsed totals for post:', JSON.stringify(totals));

  // Store logged date (when meal was logged) and posted date (when post was created)
  const loggedDate = mealData.mealDate ? new Date(mealData.mealDate) : null;
  const postedDate = admin.firestore.FieldValue.serverTimestamp();

  const post = {
    userId,
    userEmail: userData.email,
    userName: `${userData.firstName} ${userData.lastName}`,
    userFirstName: userData.firstName,
    userLastName: userData.lastName,
    mealId,
    mealDate: mealData.mealDate,
    loggedDate: loggedDate || null, // When the meal was actually logged
    mealType: mealData.mealType,
    locationId: mealData.locationId,
    locationName: mealData.locationName,
    items: mealData.items,
    totals,
    rating: mealData.rating || null,
    review: mealData.review || null,
    image: mealData.imageUrl || null, // PostCard expects 'image' field
    isPublic: true, // Default to public
    timestamp: postedDate, // Keep for backwards compatibility
    createdAt: postedDate, // Posted date - when the post was created
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  console.log('Creating post from meal log - has imageUrl:', !!mealData.imageUrl, 'image length:', mealData.imageUrl?.length || 0);

  const postRef = await db.collection(POSTS_COLLECTION).add(post);
  const postDoc = await postRef.get();
  const postData = postDoc.data();

  return {
    id: postDoc.id,
    ...postData,
    timestamp: postData.timestamp?.toDate(),
    createdAt: postData.createdAt?.toDate(),
    updatedAt: postData.updatedAt?.toDate(),
    loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
  };
};

const createPostFromScan = async (userId, scanData) => {
  try {
    console.log('createPostFromScan called with userId:', userId);
    console.log('scanData keys:', Object.keys(scanData || {}));
    
    const db = getDb();

    // Get user info
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('User not found:', userId);
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    if (!userData.firstName || !userData.lastName) {
      console.error('User profile incomplete:', { hasFirstName: !!userData.firstName, hasLastName: !!userData.lastName });
      throw new Error('User profile incomplete');
    }

    console.log('User data retrieved successfully');

    // Convert matchedItems to post items format
    const items = (scanData.matchedItems || []).map(item => {
      const cleanItem = {
        recipeId: item.recipeId || null,
        recipeName: String(item.matchedName || item.predictedName || 'Unknown dish'),
        quantity: Number(item.estimatedServings || 1),
        servingSize: String(item.portionDescription || '1 serving'),
        calories: Number(item.calories || 0),
        protein: Number(item.protein || 0),
        carbs: Number(item.carbs || 0),
        fat: Number(item.fat || 0),
      };
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined) {
          delete cleanItem[key];
        }
      });
      return cleanItem;
    });

    // Format totals - use nutritionTotals directly, but calculate from items if missing
    console.log('Creating post totals - scanData.nutritionTotals:', JSON.stringify(scanData.nutritionTotals));
    
    let totalCarbs = Number(scanData.nutritionTotals?.totalCarbs || 0);
    let totalFat = Number(scanData.nutritionTotals?.totalFat || 0);
    
    // If carbs/fat are 0 or missing, calculate from items
    if (!totalCarbs || totalCarbs === 0) {
      totalCarbs = items.reduce((sum, item) => {
        const itemCarbs = item.carbs || item.totalCarbs || item.totalCarb || 0;
        const qty = item.quantity || 1;
        return sum + (Number(itemCarbs) * qty);
      }, 0);
    }
    
    if (!totalFat || totalFat === 0) {
      totalFat = items.reduce((sum, item) => {
        const itemFat = item.fat || item.totalFat || 0;
        const qty = item.quantity || 1;
        return sum + (Number(itemFat) * qty);
      }, 0);
    }
    
    const totals = {
      calories: Number(scanData.nutritionTotals?.calories || 0),
      protein: Number(scanData.nutritionTotals?.protein || 0),
      totalCarbs: Number(totalCarbs),
      totalFat: Number(totalFat),
    };
    console.log('Final totals being stored:', JSON.stringify(totals));

    // Handle timestamp
    let timestampValue;
    if (scanData.timestamp) {
      try {
        const date = new Date(scanData.timestamp);
        if (isNaN(date.getTime())) {
          timestampValue = admin.firestore.FieldValue.serverTimestamp();
        } else {
          timestampValue = admin.firestore.Timestamp.fromDate(date);
        }
      } catch (err) {
        timestampValue = admin.firestore.FieldValue.serverTimestamp();
      }
    } else {
      timestampValue = admin.firestore.FieldValue.serverTimestamp();
    }

    // Clean matchedItems
    const cleanMatchedItems = (scanData.matchedItems || []).map(item => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const clean = {};
      if (item.recipeId !== undefined && item.recipeId !== null) {
        clean.recipeId = String(item.recipeId);
      }
      const name = item.matchedName || item.predictedName || item.name || 'Unknown dish';
      if (name) {
        clean.matchedName = String(name);
        if (item.predictedName && item.predictedName !== name) {
          clean.predictedName = String(item.predictedName);
        }
      }
      if (item.estimatedServings !== undefined && item.estimatedServings !== null) {
        clean.estimatedServings = Number(item.estimatedServings) || 1;
      }
      if (item.portionDescription !== undefined && item.portionDescription !== null) {
        clean.portionDescription = String(item.portionDescription);
      }
      if (item.calories !== undefined && item.calories !== null) {
        clean.calories = Number(item.calories) || 0;
      }
      if (item.protein !== undefined && item.protein !== null) {
        clean.protein = Number(item.protein) || 0;
      }
      if (item.carbs !== undefined && item.carbs !== null) {
        clean.carbs = Number(item.carbs) || 0;
      }
      if (item.fat !== undefined && item.fat !== null) {
        clean.fat = Number(item.fat) || 0;
      }
      return clean;
    }).filter(item => item !== null);

    // Clean unmatchedDishes
    const cleanUnmatchedDishes = (scanData.unmatchedDishes || [])
      .filter(dish => dish !== null && dish !== undefined)
      .map(dish => String(dish));

    const postData = {
      userId: String(userId),
      userEmail: String(userData.email || ''),
      userName: String(`${userData.firstName || ''} ${userData.lastName || ''}`.trim()),
      userFirstName: String(userData.firstName || ''),
      userLastName: String(userData.lastName || ''),
      mealDate: scanData.mealDate ? String(scanData.mealDate) : null,
      loggedDate: scanData.mealDate ? new Date(scanData.mealDate) : null, // When the meal was actually logged
      mealType: scanData.mealType ? String(scanData.mealType) : null,
      rating: Number(scanData.rating),
      review: (typeof scanData.review === 'string' && scanData.review.trim().length > 0) ? String(scanData.review) : null,
      locationId: String(scanData.locationId),
      locationName: String(scanData.locationName || ''),
      isPublic: scanData.isPublic !== undefined ? Boolean(scanData.isPublic) : true,
      items,
      totals,
      matchedItems: cleanMatchedItems,
      unmatchedDishes: cleanUnmatchedDishes,
      timestamp: timestampValue,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Posted date - when the post was created
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store compressed image if provided and not too large
    if (scanData.image && scanData.image.length < 750000) {
      postData.image = scanData.image;
    }

    // Remove undefined values
    Object.keys(postData).forEach(key => {
      if (postData[key] === undefined) {
        delete postData[key];
      }
    });

    console.log('About to save post to Firestore. Post data keys:', Object.keys(postData));
    console.log('Post data sample:', {
      userId: postData.userId,
      locationId: postData.locationId,
      locationName: postData.locationName,
      rating: postData.rating,
      itemsCount: postData.items?.length,
      matchedItemsCount: postData.matchedItems?.length,
      hasImage: !!postData.image,
      imageSize: postData.image?.length
    });

    const postRef = await db.collection(POSTS_COLLECTION).add(postData);
    console.log('Post saved to Firestore with ID:', postRef.id);
    
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      throw new Error('Post was created but document does not exist');
    }
    
    const savedPostData = postDoc.data();
    console.log('Post document retrieved successfully');

    // Create meal log for progress tracking
    try {
      const mealLogItems = items.map(item => ({
        recipeId: item.recipeId || null,
        recipeName: item.recipeName || 'Unknown dish',
        quantity: 1, // Scanner items already have totals (multiplied by servings), so quantity must be 1 to avoid double multiplication
        servingSize: item.servingSize || '1 serving',
        calories: String(item.calories || 0),
        protein: `${item.protein || 0}g`,
        totalCarbs: `${item.carbs || 0}g`,
        totalFat: `${item.fat || 0}g`,
        saturatedFat: '0g',
        transFat: '0g',
        cholesterol: '0mg',
        sodium: '0mg',
        dietaryFiber: '0g',
        sugars: '0g',
      }));

      const mealDate = scanData.mealDate || new Date().toISOString().split('T')[0];
      
      // Convert timestamp to Firestore Timestamp
      let mealTimestamp;
      if (scanData.timestamp) {
        try {
          const date = new Date(scanData.timestamp);
          if (isNaN(date.getTime())) {
            mealTimestamp = admin.firestore.FieldValue.serverTimestamp();
          } else {
            mealTimestamp = admin.firestore.Timestamp.fromDate(date);
          }
        } catch (err) {
          console.warn('Error converting meal timestamp, using server timestamp:', err);
          mealTimestamp = admin.firestore.FieldValue.serverTimestamp();
        }
      } else {
        mealTimestamp = admin.firestore.FieldValue.serverTimestamp();
      }

      // Import mealLogService inline (since we can't require from backend in serverless)
      const createMealLog = async (userId, userEmail, mealData) => {
        const mealLogRef = db.collection(USERS_COLLECTION)
          .doc(userId)
          .collection('meals')
          .doc();
        
        await mealLogRef.set({
          userId,
          userEmail,
          ...mealData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      };

      const mealLogData = {
        mealDate,
        mealType: scanData.mealType || null,
        mealName: scanData.mealType || null,
        locationId: scanData.locationId,
        locationName: scanData.locationName,
        items: mealLogItems,
        totals: totals, // Add totals field - this is the source of truth (1266 calories)
        timestamp: mealTimestamp,
      };
      
      console.log('💾 Saving meal log with totals:', {
        mealDate,
        totalsCalories: totals.calories,
        totalsProtein: totals.protein,
        totalsCarbs: totals.totalCarbs || totals.totalCarb,
        totalsFat: totals.totalFat,
        itemsCount: mealLogItems.length,
        firstItemCalories: mealLogItems[0]?.calories,
        firstItemQuantity: mealLogItems[0]?.quantity
      });
      
      await createMealLog(userId, userData.email || '', mealLogData);
    } catch (mealLogError) {
      console.error('Error creating meal log for post:', mealLogError);
      // Don't fail the post creation if meal log fails
    }

    return {
      id: postDoc.id,
      ...savedPostData,
      timestamp: savedPostData.timestamp?.toDate(),
      createdAt: savedPostData.createdAt?.toDate(),
      updatedAt: savedPostData.updatedAt?.toDate(),
      loggedDate: savedPostData.loggedDate?.toDate?.() || (savedPostData.loggedDate ? new Date(savedPostData.loggedDate) : null),
    };
  } catch (error) {
    console.error('Error in createPostFromScan:', error);
    throw error;
  }
};

const getFeedPosts = async (userId, limit = 50) => {
  const db = getDb();
  const friends = await getFriends(userId);
  const friendIds = friends.map(f => f.id);

  // Include the user's own posts in the feed
  const userIdsToQuery = [userId, ...friendIds];

  if (userIdsToQuery.length === 0) {
    return [];
  }

  const allPosts = [];
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  // Firestore 'in' limit is 10, so we need to batch queries
  for (let i = 0; i < userIdsToQuery.length; i += 10) {
    const batch = userIdsToQuery.slice(i, i + 10);
    const snapshot = await db
      .collection(POSTS_COLLECTION)
      .where('userId', 'in', batch)
      .get();

    snapshot.forEach(doc => {
      const postData = doc.data();
      allPosts.push({
        id: doc.id,
        ...postData,
        timestamp: postData.timestamp?.toDate(),
        createdAt: postData.createdAt?.toDate(),
        updatedAt: postData.updatedAt?.toDate(),
        loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
      });
    });
  }

  // Sort by posted date (createdAt) - most recent first
  allPosts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
    return bTime - aTime;
  });

  return allPosts.slice(0, limit);
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
    const postData = doc.data();
    posts.push({
      id: doc.id,
      ...postData,
      timestamp: postData.timestamp?.toDate(),
      createdAt: postData.createdAt?.toDate(),
      updatedAt: postData.updatedAt?.toDate(),
      loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
    });
  });

  // Sort by posted date (createdAt) - most recent first
  posts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
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
    const postData = doc.data();
    posts.push({
      id: doc.id,
      ...postData,
      timestamp: postData.timestamp?.toDate(),
      createdAt: postData.createdAt?.toDate(),
      updatedAt: postData.updatedAt?.toDate(),
      loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
    });
  });

  // Sort by posted date (createdAt) - most recent first
  posts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return posts.slice(0, limit);
};

const getPostsByLocationName = async (locationName, limit = 50) => {
  const db = getDb();

  // Normalize the location name to handle variations
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

  const normalizedName = normalizeHouseName(locationName);
  
  // Generate variations to search for (with and without "House")
  const baseName = normalizedName.replace(/\s+House\s*$/i, '').trim();
  const variations = [
    normalizedName, // "Dunster House"
    baseName, // "Dunster"
    locationName, // Original input (in case it's different)
  ];
  
  // Remove duplicates
  const uniqueVariations = [...new Set(variations)];

  // Query for all variations and combine results
  const allPosts = [];
  for (const variation of uniqueVariations) {
    const query = db
      .collection(POSTS_COLLECTION)
      .where('locationName', '==', variation);

    const snapshot = await query.get();
    snapshot.forEach(doc => {
      // Avoid duplicates by checking if post ID already exists
      if (!allPosts.find(p => p.id === doc.id)) {
        const postData = doc.data();
        allPosts.push({
          id: doc.id,
          ...postData,
          timestamp: postData.timestamp?.toDate(),
          createdAt: postData.createdAt?.toDate(),
          updatedAt: postData.updatedAt?.toDate(),
          loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
        });
      }
    });
  }

  // Sort by timestamp descending in-memory
  // Sort by posted date (createdAt) - most recent first
  allPosts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

const deletePost = async (userId, postId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();

  if (postData.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Delete associated meal log if the post has mealDate
  // (posts created from scans/meal planning have meal logs, but other posts might not)
  // Note: mealType is helpful but not required - we'll try to match by date if mealType is missing
  if (postData.mealDate) {
    try {
      const mealDate = typeof postData.mealDate === 'string' 
        ? postData.mealDate 
        : postData.mealDate.toDate ? postData.mealDate.toDate().toISOString().split('T')[0]
        : new Date(postData.mealDate).toISOString().split('T')[0];
      
      console.log(`[deletePost] Looking for meal logs to delete for post ${postId}:`, {
        userId,
        mealDate,
        mealType: postData.mealType,
      });
      
      // Get meal logs for this date
      // Note: meal logs are stored in 'meals' subcollection (not 'mealLogs')
      const mealsRef = db
        .collection('users')
        .doc(userId)
        .collection('meals');
      
      let query = mealsRef;
      if (mealDate) {
        query = query.where('mealDate', '==', mealDate);
      }
      
      const mealLogsSnapshot = await query.get();
      
      console.log(`[deletePost] Found ${mealLogsSnapshot.size} meal logs for date ${mealDate}`);
      
      // Find and delete meal logs matching the post's mealType and date
      // Normalize mealType for comparison (handle case differences and variations)
      const normalizeMealType = (type) => {
        if (!type) return '';
        return String(type).toLowerCase().trim();
      };
      
      const postMealTypeNormalized = normalizeMealType(postData.mealType);
      const hasPostMealType = postData.mealType && postMealTypeNormalized.length > 0;
      
      const matchingMealLogs = [];
      mealLogsSnapshot.forEach(doc => {
        const meal = { id: doc.id, ...doc.data() };
        
        // Normalize meal types for comparison
        const mealTypeNormalized = normalizeMealType(meal.mealType);
        const mealNameNormalized = normalizeMealType(meal.mealName);
        
        // Match if mealType or mealName matches (case-insensitive)
        // If post has no mealType, skip mealType matching and match by date only
        const mealTypeMatch = !hasPostMealType || 
                             mealTypeNormalized === postMealTypeNormalized ||
                             mealNameNormalized === postMealTypeNormalized;
        
        // Normalize dates for comparison
        let mealDateStr = '';
        if (meal.mealDate) {
          if (typeof meal.mealDate === 'string') {
            mealDateStr = meal.mealDate.split('T')[0];
          } else if (meal.mealDate.toDate) {
            mealDateStr = meal.mealDate.toDate().toISOString().split('T')[0];
          } else {
            mealDateStr = new Date(meal.mealDate).toISOString().split('T')[0];
          }
        }
        
        const dateMatch = mealDateStr === mealDate;
        
        console.log(`[deletePost] Comparing meal log ${meal.id}:`, {
          mealType: meal.mealType,
          mealName: meal.mealName,
          mealTypeNormalized,
          mealNameNormalized,
          postMealTypeNormalized,
          mealTypeMatch,
          mealDate: meal.mealDate,
          mealDateStr,
          postMealDate: mealDate,
          dateMatch,
          matches: mealTypeMatch && dateMatch,
        });
        
        if (mealTypeMatch && dateMatch) {
          matchingMealLogs.push(meal);
        }
      });
      
      console.log(`[deletePost] Found ${matchingMealLogs.length} matching meal logs to delete`);
      
      // If no exact matches found, try a more lenient approach:
      // If mealType is missing from meal log but post has it, or vice versa, still try to match by date
      if (matchingMealLogs.length === 0 && mealLogsSnapshot.size > 0) {
        console.log(`[deletePost] No exact matches found, trying lenient matching by date only`);
        // Try to match by date only if mealType is missing or doesn't match
        const lenientMatches = [];
        mealLogsSnapshot.forEach(doc => {
          const meal = { id: doc.id, ...doc.data() };
          
          // Normalize dates for comparison
          let mealDateStr = '';
          if (meal.mealDate) {
            if (typeof meal.mealDate === 'string') {
              mealDateStr = meal.mealDate.split('T')[0];
            } else if (meal.mealDate.toDate) {
              mealDateStr = meal.mealDate.toDate().toISOString().split('T')[0];
            } else {
              mealDateStr = new Date(meal.mealDate).toISOString().split('T')[0];
            }
          }
          const dateMatch = mealDateStr === mealDate;
          
          // If date matches and either:
          // 1. Meal log has no mealType (null/undefined/empty)
          // 2. Post has no mealType (shouldn't happen, but handle it)
          // 3. There's only one meal log for this date (likely the one we want)
          const mealHasNoType = !meal.mealType && !meal.mealName;
          const shouldMatch = dateMatch && (mealHasNoType || mealLogsSnapshot.size === 1);
          
          console.log(`[deletePost] Lenient match check for meal log ${meal.id}:`, {
            dateMatch,
            mealHasNoType,
            mealLogsCount: mealLogsSnapshot.size,
            shouldMatch,
          });
          
          if (shouldMatch) {
            lenientMatches.push(meal);
          }
        });
        
        if (lenientMatches.length > 0) {
          console.log(`[deletePost] Found ${lenientMatches.length} meal log(s) via lenient matching`);
          matchingMealLogs.push(...lenientMatches);
        }
      }
      
      // Delete matching meal logs
      let deletedCount = 0;
      for (const mealLog of matchingMealLogs) {
        try {
          await db
            .collection('users')
            .doc(userId)
            .collection('meals')
            .doc(mealLog.id)
            .delete();
          deletedCount++;
          console.log(`[deletePost] Deleted meal log ${mealLog.id}`);
        } catch (mealLogError) {
          console.error(`[deletePost] Error deleting meal log ${mealLog.id}:`, mealLogError);
          // Continue deleting other meal logs even if one fails
        }
      }
      
      console.log(`[deletePost] Successfully deleted ${deletedCount} meal log(s) for post ${postId}`);
    } catch (mealLogError) {
      console.error('[deletePost] Error finding/deleting meal logs for post:', mealLogError);
      // Continue with post deletion even if meal log deletion fails
    }
  } else {
    console.log(`[deletePost] Post ${postId} does not have mealDate, skipping meal log deletion:`, {
      hasMealDate: !!postData.mealDate,
      hasMealType: !!postData.mealType,
      postDataKeys: Object.keys(postData),
    });
  }

  await postRef.delete();
  return { success: true, message: 'Post deleted successfully' };
};

// Get single post by ID
const getPostById = async (userId, postId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    return null;
  }

  const postData = postDoc.data();
  
  return {
    id: postDoc.id,
    ...postData,
    timestamp: postData.timestamp?.toDate?.() || postData.timestamp,
    createdAt: postData.createdAt?.toDate(),
    updatedAt: postData.updatedAt?.toDate(),
    loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
  };
};

// Toggle upvote on a post
const toggleUpvote = async (postId, userId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();
  const upvotes = postData.upvotes || [];
  const downvotes = postData.downvotes || [];

  if (upvotes.includes(userId)) {
    // User already upvoted, remove upvote
    await postRef.update({
      upvotes: admin.firestore.FieldValue.arrayRemove(userId)
    });
  } else {
    // Add upvote and remove downvote if exists
    const updates = {
      upvotes: admin.firestore.FieldValue.arrayUnion(userId)
    };
    
    if (downvotes.includes(userId)) {
      updates.downvotes = admin.firestore.FieldValue.arrayRemove(userId);
    }
    
    await postRef.update(updates);
  }

  return { success: true };
};

// Toggle downvote on a post
const toggleDownvote = async (postId, userId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();
  const upvotes = postData.upvotes || [];
  const downvotes = postData.downvotes || [];

  if (downvotes.includes(userId)) {
    // User already downvoted, remove downvote
    await postRef.update({
      downvotes: admin.firestore.FieldValue.arrayRemove(userId)
    });
  } else {
    // Add downvote and remove upvote if exists
    const updates = {
      downvotes: admin.firestore.FieldValue.arrayUnion(userId)
    };
    
    if (upvotes.includes(userId)) {
      updates.upvotes = admin.firestore.FieldValue.arrayRemove(userId);
    }
    
    await postRef.update(updates);
  }

  return { success: true };
};

// Get comments for a post
const getComments = async (postId) => {
  const db = getDb();
  const commentsSnapshot = await db
    .collection(POSTS_COLLECTION)
    .doc(postId)
    .collection('comments')
    .orderBy('timestamp', 'asc')
    .get();

  const comments = [];
  for (const doc of commentsSnapshot.docs) {
    const commentData = doc.data();
    comments.push({
      id: doc.id,
      ...commentData,
      timestamp: commentData.timestamp?.toDate?.() || commentData.timestamp,
    });
  }

  return comments;
};

// Add a comment to a post
const addComment = async (postId, userId, commentText) => {
  const db = getDb();
  
  // Get user info
  const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();
  const userData = userDoc.data();

  const comment = {
    userId,
    userName: userData?.name || 'Anonymous',
    comment: commentText,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const commentRef = await db
    .collection(POSTS_COLLECTION)
    .doc(postId)
    .collection('comments')
    .add(comment);

  return {
    id: commentRef.id,
    ...comment,
    timestamp: new Date(),
  };
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

  // Get posts from followed dining halls
  // Match by both locationId and locationName to get posts from specific dining halls
  const allPosts = [];
  const seenPostIds = new Set(); // Track seen post IDs to avoid duplicates

  // For each followed dining hall, get posts matching both locationId and locationName
  // Remove orderBy to avoid requiring composite index - sort in-memory instead
  for (const hall of followedHalls) {
    const query = db
      .collection(POSTS_COLLECTION)
      .where('locationId', '==', hall.locationId)
      .where('locationName', '==', hall.locationName);
    
    const snapshot = await query.get();
    snapshot.forEach(doc => {
      if (!seenPostIds.has(doc.id)) {
        seenPostIds.add(doc.id);
        const postData = doc.data();
        allPosts.push({
          id: doc.id,
          ...postData,
          timestamp: postData.timestamp?.toDate(),
          createdAt: postData.createdAt?.toDate(),
          updatedAt: postData.updatedAt?.toDate(),
          loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
        });
      }
    });
  }

  // Also get user's own posts from any dining hall (even if not following)
  const userPostsQuery = db
    .collection(POSTS_COLLECTION)
    .where('userId', '==', userId);
  
  const userPostsSnapshot = await userPostsQuery.get();
  userPostsSnapshot.forEach(doc => {
    if (!seenPostIds.has(doc.id)) {
      seenPostIds.add(doc.id);
      const postData = doc.data();
      allPosts.push({
        id: doc.id,
        ...postData,
        timestamp: postData.timestamp?.toDate(),
        createdAt: postData.createdAt?.toDate(),
        updatedAt: postData.updatedAt?.toDate(),
        loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
      });
    }
  });

  // Sort all posts by posted date (createdAt) - most recent first
  allPosts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

const getPopularPosts = async (limit = 50, options = {}) => {
  const db = getDb();
  const { timeWindowHours, locationName, mealType } = options;

  // Firestore doesn't support multiple where clauses on different fields without composite indexes
  // So we'll fetch all public posts and filter in memory
  const query = db
    .collection(POSTS_COLLECTION)
    .where('isPublic', '==', true);

  const snapshot = await query.get();
  const posts = [];
  
  // Calculate cutoff date for time window if specified
  let cutoffDate = null;
  if (timeWindowHours) {
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
    cutoffDate = new Date(Date.now() - timeWindowMs);
  }

  snapshot.forEach(doc => {
    const postData = doc.data();
    
    // Apply time window filter in memory
    if (cutoffDate) {
      const postCreatedAt = postData.createdAt?.toDate?.() || 
                           (postData.createdAt ? new Date(postData.createdAt) : null) ||
                           postData.timestamp?.toDate?.() ||
                           (postData.timestamp ? new Date(postData.timestamp) : null);
      if (!postCreatedAt || postCreatedAt < cutoffDate) {
        return; // Skip this post (outside time window)
      }
    }
    
    // Apply client-side filters for location and meal type
    if (locationName && postData.locationName !== locationName) {
      return; // Skip this post
    }
    // Case-insensitive meal type comparison
    if (mealType && postData.mealType && 
        postData.mealType.toLowerCase() !== mealType.toLowerCase()) {
      return; // Skip this post
    }
    
    // Calculate upvote count - handle various formats
    let upvoteCount = 0;
    if (postData.upvotes) {
      if (Array.isArray(postData.upvotes)) {
        upvoteCount = postData.upvotes.length;
      } else if (typeof postData.upvotes === 'number') {
        upvoteCount = postData.upvotes;
      }
    }
    
    posts.push({
      id: doc.id,
      ...postData,
      upvoteCount, // Add upvote count for sorting
      timestamp: postData.timestamp?.toDate(),
      createdAt: postData.createdAt?.toDate(),
      updatedAt: postData.updatedAt?.toDate(),
      loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
    });
  });

  console.log(`getPopularPosts: Found ${posts.length} public posts before sorting`);

  // Sort by upvote count (descending), then by creation date (descending) as tiebreaker
  posts.sort((a, b) => {
    const aUpvotes = a.upvoteCount || 0;
    const bUpvotes = b.upvoteCount || 0;
    
    if (aUpvotes !== bUpvotes) {
      return bUpvotes - aUpvotes; // More upvotes first
    }
    
    // Tiebreaker: most recent first
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
    return bTime - aTime;
  });

  console.log(`getPopularPosts: Top 5 posts after sorting - upvotes:`, posts.slice(0, 5).map(p => ({ id: p.id, upvotes: p.upvoteCount, createdAt: p.createdAt })));

  // Return limited results
  return posts.slice(0, limit);
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle both Vercel's url format and standard format
    let url = req.url || req.path || '';
    
    // If URL is a full URL (starts with http:// or https://), extract just the pathname
    // This handles cases where Vercel sends full URLs like https://app.vercel.app/api/social/posts/popular
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        url = urlObj.pathname + (urlObj.search || '');
      } catch (e) {
        // If URL parsing fails, fall back to original logic
        console.warn('Failed to parse URL:', url, e);
      }
    }
    
    // Remove query string
    let pathWithoutQuery = url.split('?')[0];
    
    // Extract path from URL - handle both /api/social and direct paths
    if (pathWithoutQuery.startsWith('/api/social')) {
      pathWithoutQuery = pathWithoutQuery.replace('/api/social', '');
    }
    // Also handle /api/photo-upload
    if (pathWithoutQuery.startsWith('/api/photo-upload')) {
      pathWithoutQuery = pathWithoutQuery.replace('/api/photo-upload', '/photo-upload');
    }
    // Ensure path starts with / if it's not empty
    if (pathWithoutQuery && !pathWithoutQuery.startsWith('/')) {
      pathWithoutQuery = '/' + pathWithoutQuery;
    }
    if (!pathWithoutQuery) {
      pathWithoutQuery = '/';
    }
    
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

    // Use the already processed path
    const path = pathWithoutQuery;
    
    // Log path extraction for debugging (helpful for diagnosing Vercel routing issues)
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_PATHS === 'true') {
      console.log('Social API - method:', req.method, 'original url:', req.url, 'extracted path:', path, 'userId:', userId);
    } else {
      console.log('Social API - method:', req.method, 'path:', path, 'userId:', userId);
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

    if (req.method === 'POST' && path === '/posts/scan') {
      try {
        console.log('=== CREATE POST FROM SCAN START ===');
        console.log('Request body keys:', Object.keys(req.body || {}));
        console.log('User ID:', userId);
        
        const {
          image,
          locationId,
          locationName,
          mealDate,
          mealType,
          rating,
          review: rawReview,
          isPublic,
          matchedItems,
          unmatchedDishes,
          nutritionTotals,
          timestamp
        } = req.body;

        // Safely handle review
        const review = (typeof rawReview === 'string' && rawReview.trim().length > 0)
          ? rawReview.trim()
          : null;

        console.log('Parsed request data:', {
          hasImage: !!image,
          imageSize: image ? image.length : 0,
          locationId,
          locationName,
          mealDate,
          mealType,
          rating,
          hasReview: !!review,
          isPublic,
          matchedItemsCount: matchedItems?.length || 0,
          unmatchedDishesCount: unmatchedDishes?.length || 0
        });

        // Validate required fields
        if (!locationId) {
          console.error('Missing locationId');
          return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'locationId is required'));
        }

        if (!locationName) {
          console.error('Missing locationName');
          return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'locationName is required'));
        }

        if (!rating || rating < 1 || rating > 5) {
          console.error('Invalid rating:', rating);
          return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'rating must be between 1 and 5'));
        }

        // Ensure locationId is a string
        const locationIdStr = String(locationId).trim();
        if (!locationIdStr) {
          return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'locationId cannot be empty'));
        }

        // Handle image - compress if provided
        let processedImage = null;
        if (image && typeof image === 'string') {
          try {
            console.log('Compressing image, original size:', image.length, 'bytes');
            // Use the compressImage function from this file
            processedImage = await compressImage(image, 750); // 750KB max
            console.log('✅ Image compressed successfully, new size:', processedImage.length, 'bytes');
          } catch (error) {
            console.error('❌ Failed to compress image:', error);
            console.error('Image compression error details:', error.message, error.stack);
            // Continue without image rather than failing the entire request
            processedImage = null;
          }
        }

        console.log('Calling createPostFromScan with:', {
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

        // Create post from scan data
        const post = await createPostFromScan(userId, {
          image: processedImage,
          locationId: locationIdStr,
          locationName,
          mealDate: mealDate || new Date().toISOString().split('T')[0],
          mealType: mealType || null,
          rating,
          review: review,
          isPublic: isPublic !== undefined ? isPublic : true,
          matchedItems: matchedItems || [],
          unmatchedDishes: unmatchedDishes || [],
          nutritionTotals: nutritionTotals || {},
          timestamp: timestamp || new Date().toISOString()
        });

        console.log('=== POST CREATED SUCCESSFULLY ===');
        console.log('Post ID:', post.id);
        return res.status(201).json({ post, message: 'Post created successfully' });
      } catch (error) {
        console.error('=== CREATE POST FROM SCAN ERROR ===');
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          name: error.name
        });
        return res.status(500).json(createErrorResponse('INTERNAL_ERROR', error.message || 'Failed to create post from scan'));
      }
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

    // Post interaction routes (must come before generic /posts/:postId routes)
    if (req.method === 'POST' && path.match(/^\/posts\/[^\/]+\/upvote$/)) {
      const postId = path.split('/posts/')[1].split('/upvote')[0];
      await toggleUpvote(postId, userId);
      return res.status(200).json({ message: 'Upvote toggled successfully' });
    }

    if (req.method === 'POST' && path.match(/^\/posts\/[^\/]+\/downvote$/)) {
      const postId = path.split('/posts/')[1].split('/downvote')[0];
      await toggleDownvote(postId, userId);
      return res.status(200).json({ message: 'Downvote toggled successfully' });
    }

    if (req.method === 'GET' && path.match(/^\/posts\/[^\/]+\/comments$/)) {
      const postId = path.split('/posts/')[1].split('/comments')[0];
      const comments = await getComments(postId);
      return res.status(200).json({ comments, count: comments.length });
    }

    if (req.method === 'POST' && path.match(/^\/posts\/[^\/]+\/comments$/)) {
      const postId = path.split('/posts/')[1].split('/comments')[0];
      const { comment } = req.body;
      if (!comment || !comment.trim()) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Comment text is required'));
      }
      const newComment = await addComment(postId, userId, comment.trim());
      return res.status(201).json({ comment: newComment, message: 'Comment added successfully' });
    }

    // Popular posts endpoint (must come before single post handler to avoid matching /posts/popular as a post ID)
    if (req.method === 'GET' && path === '/posts/popular') {
      const limit = parseInt(req.query.limit || 50, 10);
      const options = {};
      if (req.query.timeWindowHours) {
        options.timeWindowHours = parseInt(req.query.timeWindowHours, 10);
      }
      if (req.query.locationName) {
        options.locationName = req.query.locationName;
      }
      if (req.query.mealType) {
        options.mealType = req.query.mealType;
      }
      const posts = await getPopularPosts(limit, options);
      return res.status(200).json({ posts, count: posts.length });
    }

    // Get single post by ID (must come after specific routes like /posts/popular)
    if (req.method === 'GET' && path.match(/^\/posts\/[^\/]+$/) && !path.includes('/user/') && !path.includes('/location') && path !== '/posts/popular') {
      const postId = path.split('/posts/')[1];
      const post = await getPostById(userId, postId);
      if (!post) {
        return res.status(404).json(createErrorResponse('NOT_FOUND', 'Post not found'));
      }
      return res.status(200).json({ post });
    }

    if (req.method === 'DELETE' && path.startsWith('/posts/')) {
      const postId = path.split('/posts/')[1];
      const result = await deletePost(userId, postId);
      return res.status(200).json(result);
    }

    // Search routes
    if (req.method === 'GET' && path === '/search/users') {
      try {
      // Get query parameter - handle both req.query (Vercel) and manual parsing
      let q = req.query?.q;
      if (!q && req.url) {
        const urlMatch = req.url.match(/[?&]q=([^&]*)/);
        if (urlMatch) {
          q = decodeURIComponent(urlMatch[1]);
        }
      }
      
      console.log('Search users - path:', path, 'req.query:', req.query, 'q:', q, 'req.url:', req.url);
      
      if (!q || q.trim().length === 0) {
        return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'Search query is required'));
      }

      const searchTerm = q.trim().toLowerCase();
      console.log('Searching for users with term:', searchTerm);
        const db = getDb();
        
        // Step 1: Get all valid users from Firebase Auth first
        // This ensures we only include users that actually exist in Auth (not deleted)
        // Wrap in try-catch to handle potential timeouts or errors on Vercel
        let validAuthUserIds = new Set();
        let useAuthFilter = false;
        try {
          // Use a timeout to prevent hanging on Vercel
          const authUsersResult = await Promise.race([
            admin.auth().listUsers(1000),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Auth listUsers timeout')), 5000)
            )
          ]);
          authUsersResult.users.forEach(user => {
            validAuthUserIds.add(user.uid);
          });
          useAuthFilter = true;
          console.log(`Loaded ${validAuthUserIds.size} valid user IDs from Firebase Auth`);
        } catch (authError) {
          console.error('Error fetching users from Firebase Auth, falling back to Firestore-only filter:', authError.message || authError);
          // If listUsers fails (e.g., timeout), we'll just filter by email presence
          // This is a fallback - not ideal but prevents the function from crashing
          useAuthFilter = false;
        }

        // Step 2: Get all users from Firestore and filter by search term
        // Only include users that exist in Firebase Auth (not deleted)
        const snapshot = await db.collection(USERS_COLLECTION).get();
        console.log(`Found ${snapshot.size} user documents in Firestore`);
      const matchingUsers = [];

      snapshot.forEach(doc => {
          try {
        const userData = doc.data();
            const searchedUserId = doc.id;
            
            // Only include users that:
            // 1. Have an email (required field for valid users)
            // 2. Still exist in Firebase Auth (not deleted) - if we successfully got the list
            if (!userData || !userData.email) {
              return;
            }
            
            // If we have validAuthUserIds (from successful listUsers call), check it
            // Otherwise, just check for email (fallback mode)
            if (useAuthFilter && !validAuthUserIds.has(searchedUserId)) {
              return;
            }

        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.toLowerCase();
        const email = (userData.email || '').toLowerCase();
        const residence = (userData.residence || '').toLowerCase();

        // Exclude the current user from search results
        if (searchedUserId === userId) {
          return;
        }

        if (fullName.includes(searchTerm) || email.includes(searchTerm) || residence.includes(searchTerm)) {
          matchingUsers.push({
            id: searchedUserId,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            residence: userData.residence,
            name: `${userData.firstName} ${userData.lastName}`,
          });
            }
          } catch (docError) {
            console.error(`Error processing user document ${doc.id}:`, docError.message || docError);
            // Continue processing other documents
        }
      });

      console.log(`Found ${matchingUsers.length} matching users for search term: ${searchTerm}`);
      const limit = parseInt(req.query.limit || 20, 10);
      return res.status(200).json({ users: matchingUsers.slice(0, limit), count: matchingUsers.length });
      } catch (error) {
        console.error('Error in search/users endpoint:', error);
        return res.status(500).json(createErrorResponse('INTERNAL_ERROR', error.message || 'A server error has occurred'));
      }
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
          // Try to match posts by location number or name (with normalization)
          let postCount = 0;
          const normalizedLocName = normalizeHouseName(loc.location_name);
          const normalizedLocOriginal = normalizeHouseName(loc.original_name || loc.location_name);
          
          for (const [key, count] of postCountMap.entries()) {
            const [postLocationId, postLocationName] = key.split('|');
            const normalizedPostName = normalizeHouseName(postLocationName);
            
            // Match by location ID or normalized location name
            if (postLocationId === loc.location_number || 
                normalizedPostName === normalizedLocName ||
                normalizedPostName === normalizedLocOriginal ||
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

