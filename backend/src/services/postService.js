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
 * Create a post from a scan (image analysis)
 */
const createPostFromScan = async (userId, scanData) => {
  try {
    const db = getDb();

    // Get user info
    const userRef = db.collection(USERS_COLLECTION).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();

    if (!userData.firstName || !userData.lastName) {
      throw new Error('User profile incomplete');
    }

    // Convert matchedItems to post items format
    // Ensure all values are Firestore-compatible (no undefined, functions, etc.)
    const items = (scanData.matchedItems || []).map(item => {
      const cleanItem = {
        recipeId: item.recipeId || null,
        recipeName: String(item.matchedName || item.predictedName || 'Unknown dish'),
        quantity: Number(item.estimatedServings || 1),
        servingSize: String(item.portionDescription || '1 serving'),
        calories: Number(item.calories || 0),
        protein: Number(item.protein || 0),
        carbs: Number(item.carbs || item.totalCarb || 0),
        fat: Number(item.fat || item.totalFat || 0),
      };
      
      // Add additional nutrition fields if available
      if (item.saturatedFat !== undefined && item.saturatedFat !== null) {
        cleanItem.saturatedFat = typeof item.saturatedFat === 'string' 
          ? item.saturatedFat 
          : `${Number(item.saturatedFat || 0).toFixed(2)}g`;
      }
      if (item.cholesterol !== undefined && item.cholesterol !== null) {
        cleanItem.cholesterol = typeof item.cholesterol === 'string' 
          ? item.cholesterol 
          : `${Math.round(Number(item.cholesterol || 0))}mg`;
      }
      if (item.sodium !== undefined && item.sodium !== null) {
        cleanItem.sodium = typeof item.sodium === 'string' 
          ? item.sodium 
          : `${Math.round(Number(item.sodium || 0))}mg`;
      }
      if (item.dietaryFiber !== undefined && item.dietaryFiber !== null) {
        cleanItem.dietaryFiber = typeof item.dietaryFiber === 'string' 
          ? item.dietaryFiber 
          : `${Number(item.dietaryFiber || 0).toFixed(2)}g`;
      }
      if (item.sugars !== undefined && item.sugars !== null) {
        cleanItem.sugars = typeof item.sugars === 'string' 
          ? item.sugars 
          : `${Number(item.sugars || 0).toFixed(2)}g`;
      }
      
      // Remove any undefined values
      Object.keys(cleanItem).forEach(key => {
        if (cleanItem[key] === undefined) {
          delete cleanItem[key];
        }
      });
      return cleanItem;
    });

    // Format totals - round to 2 decimal places
    const totals = {
      calories: Math.round(Number(scanData.nutritionTotals?.calories || 0)),
      protein: parseFloat(Number(scanData.nutritionTotals?.protein || 0).toFixed(2)),
      totalCarb: parseFloat(Number(scanData.nutritionTotals?.carbs || 0).toFixed(2)),
      totalFat: parseFloat(Number(scanData.nutritionTotals?.fat || 0).toFixed(2)),
    };

    // Handle timestamp conversion safely
    let timestampValue;
    if (scanData.timestamp) {
      try {
        const date = new Date(scanData.timestamp);
        if (isNaN(date.getTime())) {
          // Invalid date, use server timestamp
          timestampValue = admin.firestore.FieldValue.serverTimestamp();
        } else {
          timestampValue = admin.firestore.Timestamp.fromDate(date);
        }
      } catch (err) {
        console.warn('Error converting timestamp, using server timestamp:', err);
        timestampValue = admin.firestore.FieldValue.serverTimestamp();
      }
    } else {
      timestampValue = admin.firestore.FieldValue.serverTimestamp();
    }

    // Only include image if it's provided and not too large
    // Firestore has a 1MB limit per document, and base64 is ~33% larger
    // Clean matchedItems to ensure Firestore compatibility
    // Handle different property names (matchedName, predictedName, name, etc.)
    const cleanMatchedItems = (scanData.matchedItems || []).map(item => {
      if (!item || typeof item !== 'object') {
        return null; // Skip invalid items
      }
      
      const clean = {};
      // Handle recipeId (can be string or number)
      if (item.recipeId !== undefined && item.recipeId !== null) {
        clean.recipeId = String(item.recipeId);
      }
      // Handle name fields - check multiple possible property names
      const name = item.matchedName || item.predictedName || item.name || 'Unknown dish';
      if (name) {
        clean.matchedName = String(name);
        if (item.predictedName && item.predictedName !== name) {
          clean.predictedName = String(item.predictedName);
        }
      }
      // Handle numeric fields with safe conversion
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
    }).filter(item => item !== null); // Remove any null items

    // Clean unmatchedDishes - ensure all are strings
    const cleanUnmatchedDishes = (scanData.unmatchedDishes || [])
      .filter(dish => dish !== null && dish !== undefined)
      .map(dish => String(dish));

    const postData = {
      userId: String(userId),
      userEmail: String(userData.email || ''),
      userName: String(`${userData.firstName || ''} ${userData.lastName || ''}`.trim()),
      userFirstName: String(userData.firstName || ''),
      userLastName: String(userData.lastName || ''),
      // Scan-specific fields
      mealDate: scanData.mealDate ? String(scanData.mealDate) : null,
      mealType: scanData.mealType ? String(scanData.mealType) : null,
      mealName: scanData.mealType ? String(scanData.mealType) : null, // Also set mealName for consistency with other posts
      rating: Number(scanData.rating),
      review: (typeof scanData.review === 'string' && scanData.review.trim().length > 0) ? String(scanData.review) : null,
      locationId: String(scanData.locationId), // Ensure it's a string
      locationName: String(scanData.locationName || ''),
      isPublic: scanData.isPublic !== undefined ? Boolean(scanData.isPublic) : true, // Default to public
      items,
      totals,
      matchedItems: cleanMatchedItems,
      unmatchedDishes: cleanUnmatchedDishes,
      timestamp: timestampValue,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Store compressed image (base64) in Firestore
    // Firestore has 1MB document limit, so we allow up to ~750KB to be safe
    if (scanData.image && scanData.image.length < 750000) {
      postData.image = scanData.image;
      console.log('Compressed image added to post, size:', scanData.image.length, 'bytes');
    } else if (scanData.image) {
      console.warn('Image still too large after compression, skipping. Size:', scanData.image.length, 'bytes');
    } else {
      console.log('No image provided in scanData');
    }

    // Validate data types before saving to Firestore
    // Firestore doesn't accept undefined values
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

    try {
      console.log('Calling Firestore add()...');
      const postRef = await db.collection(POSTS_COLLECTION).add(postData);
      console.log('Firestore add() succeeded. Post ID:', postRef.id);
      
      const postDoc = await postRef.get();
      if (!postDoc.exists) {
        throw new Error('Post was created but document does not exist');
      }
      
      const savedPostData = postDoc.data();
      console.log('Post document retrieved successfully');
      console.log('Saved post has image:', !!savedPostData.image, savedPostData.image ? 'URL: ' + savedPostData.image.substring(0, 50) + '...' : 'none');

      // Also create a meal log so progress tracking works
      // Convert post items to meal log format
      const mealLogService = require('./mealLogService');
      const mealLogItems = items.map(item => ({
        recipeId: item.recipeId || null,
        recipeName: item.recipeName || 'Unknown dish',
        quantity: 1, // Scanner items already have totals (multiplied by servings), so quantity must be 1 to avoid double multiplication
        servingSize: item.servingSize || '1 serving',
        // Format nutrition values with units (required for calculateTotals to parse correctly)
        calories: String(item.calories || 0),
        protein: `${item.protein || 0}g`,
        totalCarb: `${item.carbs || 0}g`,
        totalFat: `${item.fat || 0}g`,
        // Set defaults for missing nutrition fields
        saturatedFat: '0g',
        transFat: '0g',
        cholesterol: '0mg',
        sodium: '0mg',
        dietaryFiber: '0g',
        sugars: '0g',
      }));

      const mealDate = scanData.mealDate || new Date().toISOString().split('T')[0];
      const mealTimestamp = scanData.timestamp ? new Date(scanData.timestamp) : new Date();

      console.log('Creating meal log with:', {
        mealDate,
        mealType: scanData.mealType,
        locationId: scanData.locationId,
        locationName: scanData.locationName,
        itemsCount: mealLogItems.length,
        allItems: mealLogItems.map(item => ({
          recipeName: item.recipeName,
          quantity: item.quantity,
          calories: item.calories,
          protein: item.protein,
          totalCarb: item.totalCarb,
          totalFat: item.totalFat,
        })),
      });

      try {
        await mealLogService.createMealLog(userId, userData.email || '', {
          mealDate,
          mealType: scanData.mealType || null,
          mealName: scanData.mealType || null,
          locationId: scanData.locationId,
          locationName: scanData.locationName,
          items: mealLogItems,
          totals: totals, // Add totals field - this is the source of truth (1209 calories from scanner)
          timestamp: mealTimestamp,
        });
        console.log('✅ Meal log created successfully for post with date:', mealDate, 'totals:', totals);
      } catch (mealLogError) {
        // Log error but don't fail the post creation
        console.error('Error creating meal log for post:', mealLogError);
        console.error('Post was still created successfully, but progress may not update');
      }

      return {
        id: postDoc.id,
        ...savedPostData,
        timestamp: savedPostData.timestamp?.toDate(),
        createdAt: savedPostData.createdAt?.toDate(),
        updatedAt: savedPostData.updatedAt?.toDate(),
      };
    } catch (firestoreError) {
      console.error('Firestore operation failed:', firestoreError);
      console.error('Firestore error code:', firestoreError.code);
      console.error('Firestore error message:', firestoreError.message);
      throw new Error(`Firestore error: ${firestoreError.message || firestoreError.code || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error in createPostFromScan:', error);
    console.error('Scan data received:', {
      hasImage: !!scanData.image,
      imageSize: scanData.image?.length,
      locationId: scanData.locationId,
      locationName: scanData.locationName,
      mealDate: scanData.mealDate,
      mealType: scanData.mealType,
      rating: scanData.rating,
      matchedItemsCount: scanData.matchedItems?.length,
      unmatchedDishesCount: scanData.unmatchedDishes?.length,
    });
    throw error;
  }
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
 * Handles location name variations like "Dunster" and "Dunster House"
 */
const getDiningHallFeedPosts = async (userId, limit = 50) => {
  const db = getDb();

  // Normalize location name helper (same as getPostsByLocationName)
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

  // Get user's followed dining halls
  const { getFollowedDiningHalls } = require('./diningHallFollowService');
  const followedHalls = await getFollowedDiningHalls(userId);

  if (followedHalls.length === 0) {
    return [];
  }

  // Get posts from followed dining halls
  // Match by locationId and handle locationName variations
  const postsRef = db.collection(POSTS_COLLECTION);
  const allPosts = [];
  const seenPostIds = new Set(); // Track seen post IDs to avoid duplicates

  // For each followed dining hall, get posts matching locationId and locationName variations
  for (const hall of followedHalls) {
    // Normalize the hall's location name and generate variations
    const normalizedName = normalizeHouseName(hall.locationName);
    const baseName = normalizedName.replace(/\s+House\s*$/i, '').trim();
    const variations = [
      normalizedName, // "Dunster House"
      baseName, // "Dunster"
      hall.locationName, // Original (in case it's different)
    ];
    
    // Remove duplicates
    const uniqueVariations = [...new Set(variations)];

    // Query for each variation
    for (const locationNameVariation of uniqueVariations) {
    const query = postsRef
      .where('locationId', '==', hall.locationId)
        .where('locationName', '==', locationNameVariation);
    
    const snapshot = await query.get();
    snapshot.forEach(doc => {
        // Avoid duplicates by checking if post ID already exists
        if (!seenPostIds.has(doc.id)) {
          seenPostIds.add(doc.id);
      allPosts.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      });
        }
    });
    }
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
 * Handles variations like "Dunster" and "Dunster House"
 */
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
        allPosts.push({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    });
      }
  });
  }

  // Sort by timestamp descending in-memory
  allPosts.sort((a, b) => {
    const aTime = a.timestamp || a.createdAt || new Date(0);
    const bTime = b.timestamp || b.createdAt || new Date(0);
    return bTime - aTime;
  });

  // Return limited results
  return allPosts.slice(0, limit);
};

/**
 * Get a single post by ID
 */
const getPostById = async (userId, postId) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();

  // Verify ownership (optional - can be removed if you want to allow viewing any post)
  if (postData.userId !== userId) {
    throw new Error('Unauthorized: You can only view your own posts');
  }

  return {
    id: postDoc.id,
    ...postData,
    timestamp: postData.timestamp?.toDate(),
    createdAt: postData.createdAt?.toDate(),
    updatedAt: postData.updatedAt?.toDate(),
  };
};

/**
 * Update a post
 */
const updatePost = async (userId, postId, updateData) => {
  const db = getDb();
  const postRef = db.collection(POSTS_COLLECTION).doc(postId);
  const postDoc = await postRef.get();

  if (!postDoc.exists) {
    throw new Error('Post not found');
  }

  const postData = postDoc.data();

  // Verify ownership
  if (postData.userId !== userId) {
    throw new Error('Unauthorized: You can only update your own posts');
  }

  // Build update object with only allowed fields
  const allowedFields = [
    'mealDate',
    'mealType',
    'mealName',
    'rating',
    'review',
    'locationId',
    'locationName',
    'isPublic',
  ];

  const updateObject = {
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add allowed fields if they're provided
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      if (field === 'rating') {
        updateObject[field] = Number(updateData[field]);
      } else if (field === 'review') {
        // Handle review: null or empty string becomes null
        const review = typeof updateData[field] === 'string' && updateData[field].trim().length > 0
          ? String(updateData[field].trim())
          : null;
        updateObject[field] = review;
      } else if (field === 'mealDate') {
        updateObject[field] = updateData[field] ? String(updateData[field]) : null;
      } else if (field === 'mealType' || field === 'mealName') {
        updateObject[field] = updateData[field] ? String(updateData[field]) : null;
      } else if (field === 'locationId' || field === 'locationName') {
        updateObject[field] = String(updateData[field] || '');
      } else if (field === 'isPublic') {
        updateObject[field] = Boolean(updateData[field]);
      }
    }
  });

  // Handle image update (now expects URL from Firebase Storage, not base64)
  if (updateData.image !== undefined) {
    if (updateData.image && typeof updateData.image === 'string') {
      // Image is now a URL from Firebase Storage
      updateObject.image = updateData.image;
      console.log('Image URL updated in post:', updateData.image);
    } else if (updateData.image === null) {
      // Allow removing image by setting to null
      updateObject.image = null;
      console.log('Image removed from post');
    }
  }

  await postRef.update(updateObject);

  // Get updated post
  const updatedDoc = await postRef.get();
  const updatedData = updatedDoc.data();

  return {
    id: updatedDoc.id,
    ...updatedData,
    timestamp: updatedData.timestamp?.toDate(),
    createdAt: updatedData.createdAt?.toDate(),
    updatedAt: updatedData.updatedAt?.toDate(),
  };
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

  // Delete associated meal log if the post has mealDate
  // (posts created from scans/meal planning have meal logs, but other posts might not)
  // Note: mealType is helpful but not required - we'll try to match by date if mealType is missing
  if (postData.mealDate) {
    try {
      const mealLogService = require('./mealLogService');
      const mealDate = typeof postData.mealDate === 'string' 
        ? postData.mealDate 
        : postData.mealDate.toDate ? postData.mealDate.toDate().toISOString().split('T')[0]
        : new Date(postData.mealDate).toISOString().split('T')[0];
      
      console.log(`[deletePost] Looking for meal logs to delete for post ${postId}:`, {
        userId,
        mealDate,
        mealType: postData.mealType || '(not set)',
        postDataKeys: Object.keys(postData),
        postMealDate: postData.mealDate,
        postMealType: postData.mealType,
      });
      
      // Get meal logs for this date
      // Use a direct Firestore query to ensure we get all meal logs for this date
      const db = getDb();
      const mealsRef = db
        .collection('users')
        .doc(userId)
        .collection('meals');
      
      // Query directly by mealDate to ensure we find the meal log
      const mealLogsSnapshot = await mealsRef
        .where('mealDate', '==', mealDate)
        .get();
      
      const mealsArray = [];
      mealLogsSnapshot.forEach(doc => {
        mealsArray.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      console.log(`[deletePost] Found ${mealsArray.length} meal logs for date ${mealDate}`);
      if (mealsArray.length > 0) {
        console.log(`[deletePost] Meal log details:`, mealsArray.map(m => ({
          id: m.id,
          mealDate: m.mealDate,
          mealType: m.mealType,
          mealName: m.mealName,
        })));
      }
      
      // Find and delete meal logs matching the post's mealType and date
      // Normalize mealType for comparison (handle case differences and variations)
      const normalizeMealType = (type) => {
        if (!type) return '';
        return String(type).toLowerCase().trim();
      };
      
      const postMealTypeNormalized = normalizeMealType(postData.mealType);
      const hasPostMealType = postData.mealType && postMealTypeNormalized.length > 0;
      
      const matchingMealLogs = mealsArray.filter(meal => {
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
        
        return mealTypeMatch && dateMatch;
      }) || [];
      
      console.log(`[deletePost] Found ${matchingMealLogs.length} matching meal logs to delete`);
      
      // If no exact matches found, try a more lenient approach:
      // If mealType is missing from meal log but post has it, or vice versa, still try to match by date
      if (matchingMealLogs.length === 0 && mealsArray.length > 0) {
        console.log(`[deletePost] No exact matches found, trying lenient matching by date only`);
        // Try to match by date only if mealType is missing or doesn't match
        const lenientMatches = mealsArray.filter(meal => {
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
          const shouldMatch = dateMatch && (mealHasNoType || mealsArray.length === 1);
          
          console.log(`[deletePost] Lenient match check for meal log ${meal.id}:`, {
            dateMatch,
            mealHasNoType,
            mealLogsCount: mealsArray.length,
            shouldMatch,
          });
          
          return shouldMatch;
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
          await mealLogService.deleteMealLog(userId, mealLog.id);
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

  // Images are stored in Firestore as base64, so no separate deletion needed

  await postRef.delete();

  return { success: true, message: 'Post deleted successfully' };
};

module.exports = {
  createPost,
  createPostFromScan,
  getFeedPosts,
  getDiningHallFeedPosts,
  getPostsByUser,
  getPostsByLocation,
  getPostsByLocationName,
  getPostById,
  updatePost,
  deletePost,
};

