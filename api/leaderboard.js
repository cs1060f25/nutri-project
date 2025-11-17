/**
 * Vercel serverless function for leaderboard API endpoints
 */

const admin = require('firebase-admin');

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
const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';

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

/**
 * Get leaderboard data - users ranked by post count
 */
const getLeaderboard = async (filters = {}, limit = 100) => {
  const db = getDb();
  
  try {
    // Step 1: Get all valid users from Firebase Auth first
    const authUsersResult = await admin.auth().listUsers(1000);
    const validAuthUserIds = new Set();
    authUsersResult.users.forEach(user => {
      validAuthUserIds.add(user.uid);
    });

    // Step 2: Get user profiles from Firestore
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    const userProfiles = {};
    const userIds = [];
    const validUserIds = new Set();
    
    usersSnapshot.forEach(doc => {
      if (doc.exists) {
        const userData = doc.data();
        const userId = doc.id;
        if (userData && userData.email && validAuthUserIds.has(userId)) {
          userProfiles[userId] = userData;
          userIds.push(userId);
          validUserIds.add(userId);
        }
      }
    });

    if (userIds.length === 0) {
      return [];
    }

    // Step 3: Get all posts
    const postsSnapshot = await db.collection(POSTS_COLLECTION).get();
    
    // Step 4: Count posts per user
    const userPostCounts = {};
    postsSnapshot.forEach(doc => {
      const postData = doc.data();
      const userId = postData.userId;
      if (userId && validUserIds.has(userId)) {
        if (!userPostCounts[userId]) {
          userPostCounts[userId] = {
            userId,
            postCount: 0
          };
        }
        userPostCounts[userId].postCount++;
      }
    });

    // Step 5: Combine post counts with user profiles and apply filters
    const leaderboard = [];
    for (const userId of userIds) {
      const profile = userProfiles[userId];
      if (!profile || !profile.email) continue;

      // Apply filters
      if (filters.classYear) {
        const emailYear = profile.email ? profile.email.match(/class(\d{4})/) : null;
        const profileYear = profile.classYear || (emailYear ? emailYear[1] : null);
        if (profileYear !== filters.classYear) continue;
      }

      if (filters.residence) {
        if (profile.residence !== filters.residence) continue;
      }

      if (filters.dietaryPattern) {
        if (profile.dietaryPattern !== filters.dietaryPattern) continue;
      }

      const postCounts = userPostCounts[userId] || { postCount: 0 };

      leaderboard.push({
        userId,
        userName: profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}` 
          : profile.email || 'Unknown User',
        userEmail: profile.email || '',
        postCount: postCounts.postCount,
        residence: profile.residence || null,
        dietaryPattern: profile.dietaryPattern || null,
        classYear: profile.classYear || null
      });
    }

    // Step 6: Sort by post count (descending) and limit
    leaderboard.sort((a, b) => b.postCount - a.postCount);
    
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return leaderboard.slice(0, limit);
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    throw error;
  }
};

/**
 * Get available filter options for leaderboard
 */
const getFilterOptions = async () => {
  const db = getDb();
  
  try {
    // Get valid users from Firebase Auth first
    const authUsersResult = await admin.auth().listUsers(1000);
    const validAuthUserIds = new Set();
    authUsersResult.users.forEach(user => {
      validAuthUserIds.add(user.uid);
    });

    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    
    const classYears = new Set();
    const residences = new Set();
    const dietaryPatterns = new Set();

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      const userId = doc.id;
      
      if (!data || !data.email || !validAuthUserIds.has(userId)) return;
      
      if (data.classYear) {
        classYears.add(data.classYear);
      } else if (data.email) {
        const emailYear = data.email.match(/class(\d{4})/);
        if (emailYear) {
          classYears.add(emailYear[1]);
        }
      }

      if (data.residence) {
        residences.add(data.residence);
      }

      if (data.dietaryPattern) {
        dietaryPatterns.add(data.dietaryPattern);
      }
    });

    return {
      classYears: Array.from(classYears).sort(),
      residences: Array.from(residences).sort(),
      dietaryPatterns: Array.from(dietaryPatterns).sort()
    };
  } catch (error) {
    console.error('Error in getFilterOptions:', error);
    throw error;
  }
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify token for all requests
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // Extract path from URL
    const url = req.url || req.path || '';
    const path = url.split('?')[0].replace(/^\/api\/leaderboard/, '').replace(/^\//, '');

    // Route to appropriate handler
    if (path === 'filters' || path.startsWith('filters')) {
      const options = await getFilterOptions();
      return res.status(200).json({
        success: true,
        ...options
      });
    } else {
      const { classYear, residence, dietaryPattern, limit } = req.query;
      
      const filters = {};
      if (classYear) filters.classYear = classYear;
      if (residence) filters.residence = residence;
      if (dietaryPattern) filters.dietaryPattern = dietaryPattern;
      
      const limitNum = limit ? parseInt(limit, 10) : 100;
      
      const leaderboard = await getLeaderboard(filters, limitNum);
      
      return res.status(200).json({
        success: true,
        leaderboard,
        filters
      });
    }
  } catch (error) {
    console.error('Leaderboard API error:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or missing authentication token'
      });
    }
    
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error'
      });
    }
  }
};
