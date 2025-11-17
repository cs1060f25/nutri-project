/**
 * Script to check meal logs for a user
 * 
 * Usage:
 *   node scripts/checkMealLogs.js <email>
 * 
 * Example:
 *   node scripts/checkMealLogs.js kharvey@college.harvard.edu
 */

const { admin, initializeFirebase } = require('../src/config/firebase');

const checkMealLogs = async (email) => {
  try {
    // Initialize Firebase
    initializeFirebase();

    console.log(`\n📋 Checking meal logs for: ${email}\n`);

    // Find user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;

    console.log(`User ID: ${userId}\n`);

    // Get all meal logs
    const db = admin.firestore();
    const mealsRef = db
      .collection('users')
      .doc(userId)
      .collection('meals');

    const snapshot = await mealsRef.get();

    console.log(`Total meal logs: ${snapshot.size}\n`);

    if (snapshot.size === 0) {
      console.log('No meal logs found.');
      return;
    }

    // Group by date
    const mealsByDate = {};
    const today = new Date().toISOString().split('T')[0];

    snapshot.forEach(doc => {
      const meal = doc.data();
      const mealDate = meal.mealDate || 'unknown';
      
      if (!mealsByDate[mealDate]) {
        mealsByDate[mealDate] = [];
      }
      
      mealsByDate[mealDate].push({
        id: doc.id,
        mealType: meal.mealType || meal.mealName || 'unknown',
        locationName: meal.locationName || 'unknown',
        timestamp: meal.timestamp?.toDate ? meal.timestamp.toDate().toISOString() : meal.timestamp,
      });
    });

    // Sort dates
    const sortedDates = Object.keys(mealsByDate).sort();

    console.log('Meal logs by date:');
    console.log('─'.repeat(80));
    
    sortedDates.forEach(date => {
      const meals = mealsByDate[date];
      const isToday = date === today;
      console.log(`\n${date}${isToday ? ' (TODAY)' : ''}: ${meals.length} meal(s)`);
      meals.forEach(meal => {
        console.log(`  - ${meal.mealType} at ${meal.locationName} (ID: ${meal.id})`);
      });
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\nTotal: ${snapshot.size} meal log(s) across ${sortedDates.length} day(s)`);

  } catch (error) {
    console.error('❌ Error checking meal logs:', error.message);
    process.exit(1);
  }

  process.exit(0);
};

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/checkMealLogs.js <email>');
  process.exit(1);
}

const email = args[0];
checkMealLogs(email);

