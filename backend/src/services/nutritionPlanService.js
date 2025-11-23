/**
 * Service for managing nutrition plans in Firestore.
 * Plans are stored as a subcollection under each user.
 */

const { admin } = require('../config/firebase');

const USERS_COLLECTION = 'users';
const NUTRITION_PLANS_SUBCOLLECTION = 'nutritionPlans';
const getDb = () => admin.firestore();

/**
 * Create or update a nutrition plan for a user.
 * If planId is provided, updates that plan; otherwise creates a new one.
 */
const saveNutritionPlan = async (userId, planData, planId = null) => {
  if (!userId) {
    throw new Error('User id is required to save a nutrition plan');
  }

  const timestamp = admin.firestore.FieldValue.serverTimestamp();
  const plansRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION);

  const payload = {
    preset: planData.preset || null,
    presetName: planData.presetName || null,
    metrics: planData.metrics || {},
    updatedAt: timestamp,
  };

  let docRef;
  if (planId) {
    // Update existing plan
    docRef = plansRef.doc(planId);
    // Use merge: true but explicitly set metrics to replace the entire object
    // This ensures disabled metrics are removed
    await docRef.set(payload, { merge: true });
    // Explicitly update metrics to ensure disabled ones are removed
    await docRef.update({ metrics: planData.metrics || {} });
  } else {
    // Create new plan
    payload.createdAt = timestamp;
    payload.isActive = true; // Mark as active plan
    
    // Deactivate any existing active plans
    const activePlans = await plansRef.where('isActive', '==', true).get();
    const batch = getDb().batch();
    activePlans.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });
    
    // Create new plan
    docRef = plansRef.doc();
    batch.set(docRef, payload);
    await batch.commit();
  }

  const savedDoc = await docRef.get();
  return {
    id: savedDoc.id,
    ...savedDoc.data(),
  };
};

/**
 * Get the active nutrition plan for a user.
 */
const getActiveNutritionPlan = async (userId) => {
  if (!userId) {
    throw new Error('User id is required to fetch nutrition plan');
  }

  const plansRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION);

  const snapshot = await plansRef
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * Get a specific nutrition plan by ID.
 */
const getNutritionPlanById = async (userId, planId) => {
  if (!userId || !planId) {
    throw new Error('User id and plan id are required');
  }

  const docRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION)
    .doc(planId);

  const doc = await docRef.get();
  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
};

/**
 * Get all nutrition plans for a user (for history).
 */
const getAllNutritionPlans = async (userId, limit = 10) => {
  if (!userId) {
    throw new Error('User id is required to fetch nutrition plans');
  }

  const snapshot = await getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Delete a nutrition plan.
 */
const deleteNutritionPlan = async (userId, planId) => {
  if (!userId || !planId) {
    throw new Error('User id and plan id are required to delete a plan');
  }

  const docRef = getDb()
    .collection(USERS_COLLECTION)
    .doc(userId)
    .collection(NUTRITION_PLANS_SUBCOLLECTION)
    .doc(planId);

  await docRef.delete();
  return { success: true };
};

module.exports = {
  saveNutritionPlan,
  getActiveNutritionPlan,
  getNutritionPlanById,
  getAllNutritionPlans,
  deleteNutritionPlan,
};

