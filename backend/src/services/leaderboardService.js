/**
 * Service for leaderboard functionality - counting posts per user with filters
 */

const { admin } = require('../config/firebase');

const POSTS_COLLECTION = 'posts';
const USERS_COLLECTION = 'users';

const getDb = () => admin.firestore();

/**
 * Get leaderboard data - users ranked by post count
 * @param {Object} filters - Filter options
 * @param {string} filters.classYear - Filter by class year (e.g., "2025", "2026")
 * @param {string} filters.residence - Filter by residence/dining hall
 * @param {string} filters.dietaryPattern - Filter by dietary pattern (e.g., "vegan", "vegetarian")
 * @param {number} limit - Maximum number of results to return
 */
const getLeaderboard = async (filters = {}, limit = 100) => {
  const db = getDb();
  
  try {
    // Check if all filters are empty (show all users)
    const hasFilters = filters.classYear || filters.residence || filters.dietaryPattern;
    
    // Step 1: Get all valid users from Firebase Auth first
    // This ensures we only include users that actually exist in Auth (not deleted)
    const authUsersResult = await admin.auth().listUsers(1000); // Get up to 1000 users
    const validAuthUserIds = new Set();
    authUsersResult.users.forEach(user => {
      validAuthUserIds.add(user.uid);
    });

    // Step 2: Get user profiles from Firestore, but only include those that exist in Auth
    // Only include users that have valid data (email is required) AND exist in Auth
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    const userProfiles = {};
    const userIds = [];
    const validUserIds = new Set(); // Track valid user IDs for post filtering
    
    usersSnapshot.forEach(doc => {
      if (doc.exists) {
        const userData = doc.data();
        const userId = doc.id;
        // Only include users that:
        // 1. Have an email (required field for valid users)
        // 2. Still exist in Firebase Auth (not deleted)
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

    // Step 3: Get all posts (both public and private)
    // Only count posts from users that exist in both Firestore AND Firebase Auth
    const postsSnapshot = await db.collection(POSTS_COLLECTION).get();
    
    // Step 4: Count posts per user (only for valid users)
    const userPostCounts = {};
    postsSnapshot.forEach(doc => {
      const postData = doc.data();
      const userId = postData.userId;
      // Only count posts from users that exist in the users collection
      if (userId && validUserIds.has(userId)) {
        if (!userPostCounts[userId]) {
          userPostCounts[userId] = {
            userId,
            postCount: 0,
            publicPostCount: 0,
            privatePostCount: 0
          };
        }
        userPostCounts[userId].postCount++;
        // Note: Posts don't currently have a visibility field, so we count all as public
        // If you add visibility later, you can check postData.isPublic or similar
        userPostCounts[userId].publicPostCount++;
      }
    });

    // Step 5: Combine post counts with user profiles and apply filters
    // Only process users that exist in both the users collection and have valid profiles
    const leaderboard = [];
    for (const userId of userIds) {
      const profile = userProfiles[userId];
      // Skip if profile doesn't exist or doesn't have required fields
      if (!profile || !profile.email) continue;

      // Apply filters
      if (filters.classYear) {
        // Use classYear field from profile, or extract from email as fallback
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

      // Get post counts (default to 0 if user has no posts)
      const postCounts = userPostCounts[userId] || {
        postCount: 0,
        publicPostCount: 0,
        privatePostCount: 0
      };

      leaderboard.push({
        userId,
        userName: profile.firstName && profile.lastName 
          ? `${profile.firstName} ${profile.lastName}` 
          : profile.email || 'Unknown User',
        userEmail: profile.email || '',
        postCount: postCounts.postCount,
        publicPostCount: postCounts.publicPostCount,
        privatePostCount: postCounts.privatePostCount,
        residence: profile.residence || null,
        dietaryPattern: profile.dietaryPattern || null,
        classYear: profile.classYear || null
      });
    }

    // Step 6: Sort by post count (descending) and limit
    leaderboard.sort((a, b) => b.postCount - a.postCount);
    
    // Add rank
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
      
      // Only process users that:
      // 1. Have an email (valid users)
      // 2. Still exist in Firebase Auth (not deleted)
      if (!data || !data.email || !validAuthUserIds.has(userId)) return;
      
      // Use classYear field, or extract from email as fallback
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

module.exports = {
  getLeaderboard,
  getFilterOptions
};

