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
const createPost = async (userId, mealId, mealData, isPublic = true, displayOptions = null) => {
  const db = getDb();

  // Get user info
  const userRef = db.collection(USERS_COLLECTION).doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new Error('User not found');
  }

  const userData = userDoc.data();

  // Convert totals to numbers (meal logs store them as strings with units)
  const parseNutrient = (value) => {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  };

  const totals = mealData.totals ? {
    calories: parseNutrient(mealData.totals.calories),
    protein: parseNutrient(mealData.totals.protein),
    totalCarb: parseNutrient(mealData.totals.totalCarb),
    totalFat: parseNutrient(mealData.totals.totalFat),
    saturatedFat: parseNutrient(mealData.totals.saturatedFat),
    transFat: parseNutrient(mealData.totals.transFat),
    cholesterol: parseNutrient(mealData.totals.cholesterol),
    sodium: parseNutrient(mealData.totals.sodium),
    dietaryFiber: parseNutrient(mealData.totals.dietaryFiber),
    sugars: parseNutrient(mealData.totals.sugars),
  } : null;

  // Store logged date (when meal was logged) and posted date (when post was created)
  const loggedDate = mealData.mealDate ? new Date(mealData.mealDate) : null;
  const postedDate = admin.firestore.FieldValue.serverTimestamp();

  const post = {
    userId,
    userEmail: userData.email,
    userName: `${userData.firstName} ${userData.lastName}`,
    userFirstName: userData.firstName,
    userLastName: userData.lastName,
    mealId, // Reference to the original meal
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
    isPublic: isPublic !== undefined ? Boolean(isPublic) : true, // Default to public
    displayOptions: displayOptions || {
      image: true,
      items: true,
      location: true,
      mealType: true,
      rating: true,
      review: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
    }, // User's display preferences for what to show in the post
    timestamp: postedDate, // Keep for backwards compatibility
    createdAt: postedDate, // Posted date - when the post was created
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
    loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
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
      loggedDate: scanData.mealDate ? new Date(scanData.mealDate) : null, // When the meal was actually logged
      mealType: scanData.mealType ? String(scanData.mealType) : null,
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
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Posted date - when the post was created
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
        loggedDate: savedPostData.loggedDate?.toDate?.() || (savedPostData.loggedDate ? new Date(savedPostData.loggedDate) : null),
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
 * Get feed posts (posts from friends and own posts)
 */
const getFeedPosts = async (userId, limit = 50) => {
  const db = getDb();

  // Get user's friends
  const { getFriends } = require('./friendService');
  const friends = await getFriends(userId);
  const friendIds = friends.map(f => f.id);

  // Include the user's own posts in the feed
  const userIdsToQuery = [userId, ...friendIds];

  if (userIdsToQuery.length === 0) {
    return [];
  }

  // Get posts from friends and self
  const postsRef = db.collection(POSTS_COLLECTION);

  // Firestore 'in' limit is 10, so we need to batch queries
  const allPosts = [];
  
  for (let i = 0; i < userIdsToQuery.length; i += 10) {
    const batch = userIdsToQuery.slice(i, i + 10);
    const batchQuery = postsRef
      .where('userId', 'in', batch);
    
    const snapshot = await batchQuery.get();
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

  // Sort all posts by timestamp descending (with fallback to createdAt)
  // Sort by posted date (createdAt) - most recent first
  allPosts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
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
  }

  // Sort all posts by timestamp descending (with fallback to createdAt)
  // Sort by posted date (createdAt) - most recent first
  allPosts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
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

  // Sort by timestamp descending in-memory
  // Sort by posted date (createdAt) - most recent first
  posts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
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

  // Sort by timestamp descending in-memory
  // Sort by posted date (createdAt) - most recent first
  posts.sort((a, b) => {
    const aTime = a.createdAt || a.timestamp || new Date(0);
    const bTime = b.createdAt || b.timestamp || new Date(0);
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

  // Allow anyone to view any post (no ownership verification needed for viewing)
  
  return {
    id: postDoc.id,
    ...postData,
    timestamp: postData.timestamp?.toDate(),
    createdAt: postData.createdAt?.toDate(),
    updatedAt: postData.updatedAt?.toDate(),
    loggedDate: postData.loggedDate?.toDate?.() || (postData.loggedDate ? new Date(postData.loggedDate) : null),
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
    'rating',
    'review',
    'locationId',
    'locationName',
    'isPublic',
    'displayOptions',
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
      } else if (field === 'mealType') {
        updateObject[field] = updateData[field] ? String(updateData[field]) : null;
      } else if (field === 'locationId' || field === 'locationName') {
        updateObject[field] = String(updateData[field] || '');
      } else if (field === 'isPublic') {
        updateObject[field] = Boolean(updateData[field]);
      } else if (field === 'displayOptions') {
        updateObject[field] = updateData[field];
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

  // Note: We do NOT delete the associated meal log when deleting a post
  // The meal log should remain in the user's history even if they delete the social post
  // This allows users to remove posts from social feed without losing their meal data

  await postRef.delete();

  return { success: true, message: 'Post deleted successfully' };
};

/**
 * Toggle upvote on a post
 * @param {string} postId - The ID of the post to upvote
 * @param {string} userId - The ID of the user upvoting
 * @returns {Promise<Object>} Result object
 */
const toggleUpvote = async (postId, userId) => {
  try {
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
  } catch (error) {
    console.error('Error toggling upvote:', error);
    throw error;
  }
};

/**
 * Toggle downvote on a post
 * @param {string} postId - The ID of the post to downvote
 * @param {string} userId - The ID of the user downvoting
 * @returns {Promise<Object>} Result object
 */
const toggleDownvote = async (postId, userId) => {
  try {
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
  } catch (error) {
    console.error('Error toggling downvote:', error);
    throw error;
  }
};

/**
 * Get comments for a post
 * @param {string} postId - The ID of the post
 * @returns {Promise<Array>} Array of comments
 */
const getComments = async (postId) => {
  try {
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
  } catch (error) {
    console.error('Error getting comments:', error);
    throw error;
  }
};

/**
 * Add a comment to a post
 * @param {string} postId - The ID of the post
 * @param {string} userId - The ID of the user commenting
 * @param {string} commentText - The comment text
 * @returns {Promise<Object>} The created comment
 */
const addComment = async (postId, userId, commentText) => {
  try {
    const db = getDb();
    
    // Get user info
    const userDoc = await db.collection('users').doc(userId).get();
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
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
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
  toggleUpvote,
  toggleDownvote,
  getComments,
  addComment,
};

