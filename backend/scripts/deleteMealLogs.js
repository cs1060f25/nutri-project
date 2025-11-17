/**
 * Script to delete meal logs for a user
 * 
 * Usage:
 *   node scripts/deleteMealLogs.js <email> [date]
 * 
 * Examples:
 *   node scripts/deleteMealLogs.js kharvey@college.harvard.edu 2025-11-17
 *   node scripts/deleteMealLogs.js kharvey@college.harvard.edu (deletes all)
 */

const { admin, initializeFirebase } = require('../src/config/firebase');

const deleteMealLogs = async (email, targetDate = null) => {
  try {
    // Initialize Firebase
    initializeFirebase();

    console.log(`\n🗑️  Deleting meal logs for: ${email}`);
    if (targetDate) {
      console.log(`   Date filter: ${targetDate}\n`);
    } else {
      console.log(`   Deleting ALL meal logs\n`);
    }

    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    console.log(`User ID: ${userId}\n`);

    // Get meal logs
    const db = admin.firestore();
    const mealsRef = db
      .collection('users')
      .doc(userId)
      .collection('meals');

    let query = mealsRef;
    if (targetDate) {
      query = query.where('mealDate', '==', targetDate);
    }

    const snapshot = await query.get();

    console.log(`Found ${snapshot.size} meal log(s) to delete\n`);

    if (snapshot.size === 0) {
      console.log('No meal logs found to delete.');
      return;
    }

    // Show what will be deleted
    console.log('Meal logs to delete:');
    console.log('─'.repeat(80));
    snapshot.forEach(doc => {
      const meal = doc.data();
      console.log(`  - ${doc.id}: ${meal.mealDate} - ${meal.mealType || meal.mealName || 'unknown'} at ${meal.locationName || 'unknown'}`);
    });
    console.log('─'.repeat(80));

    // Delete them
    const batch = db.batch();
    let count = 0;
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();

    console.log(`\n✅ Successfully deleted ${count} meal log(s)`);

  } catch (error) {
    console.error('❌ Error deleting meal logs:', error.message);
    process.exit(1);
  }

  process.exit(0);
};

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/deleteMealLogs.js <email> [date]');
  console.error('Example: node scripts/deleteMealLogs.js kharvey@college.harvard.edu 2025-11-17');
  process.exit(1);
}

const email = args[0];
const date = args[1] || null;
deleteMealLogs(email, date);

