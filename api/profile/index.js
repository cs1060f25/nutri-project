// Vercel serverless function for /api/profile
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
const USERS_COLLECTION = 'users';

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

// Build the canonical profile payload we store for each user
const buildProfilePayload = (data = {}) => {
  const payload = {
    email: data.email || null,
    firstName: data.firstName || null,
    lastName: data.lastName || null,
    residence: data.residence || null,
  };

  // Add optional fields if they exist
  if (data.birthday !== undefined) payload.birthday = data.birthday;
  if (data.age !== undefined) payload.age = data.age;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.height !== undefined) payload.height = data.height;
  if (data.weight !== undefined) payload.weight = data.weight;
  if (data.activityLevel !== undefined) payload.activityLevel = data.activityLevel;
  if (data.dietaryPattern !== undefined) payload.dietaryPattern = data.dietaryPattern;
  if (data.isKosher !== undefined) payload.isKosher = data.isKosher;
  if (data.isHalal !== undefined) payload.isHalal = data.isHalal;
  if (data.allergies !== undefined) payload.allergies = data.allergies || [];
  if (data.healthConditions !== undefined) payload.healthConditions = data.healthConditions || [];
  if (data.primaryGoal !== undefined) payload.primaryGoal = data.primaryGoal;

  return payload;
};

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const decodedToken = await verifyToken(req.headers.authorization);
    const userId = decodedToken.uid;

    // GET /api/profile - Get user profile
    if (req.method === 'GET') {
      console.log('✅ Profile GET route for userId:', userId);
      
      const profileDoc = await getDb().collection(USERS_COLLECTION).doc(userId).get();
      
      if (!profileDoc.exists) {
        console.log('❌ Profile not found for userId:', userId);
        return res.status(404).json(
          createErrorResponse('PROFILE_NOT_FOUND', 'User profile not found.')
        );
      }

      const profile = profileDoc.data();
      console.log('✅ Profile found with fields:', Object.keys(profile));
      
      return res.status(200).json({
        profile,
      });
    }

    // PUT /api/profile - Update user profile
    if (req.method === 'PUT') {
      console.log('✅ Profile PUT route for userId:', userId);
      
      const updates = req.body;
      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json(
          createErrorResponse('INVALID_REQUEST', 'Profile data is required.')
        );
      }

      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const profileRef = getDb().collection(USERS_COLLECTION).doc(userId);
      const payload = {
        ...buildProfilePayload(updates),
        updatedAt: timestamp,
      };

      await profileRef.set(payload, { merge: true });
      
      const updatedDoc = await profileRef.get();
      const updatedProfile = updatedDoc.data();
      
      console.log('✅ Profile updated with fields:', Object.keys(updatedProfile));
      
      return res.status(200).json({
        profile: updatedProfile,
      });
    }

    // Method not allowed
    return res.status(405).json(createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed'));

  } catch (error) {
    console.error('Error with profile:', error);
    
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json(createErrorResponse('INVALID_TOKEN', 'Invalid or missing token.'));
    }
    
    return res.status(500).json(createErrorResponse('INTERNAL', 'Failed to process profile request.'));
  }
};

