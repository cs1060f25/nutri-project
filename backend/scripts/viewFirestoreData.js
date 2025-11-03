#!/usr/bin/env node

/**
 * Script to view Firestore collections data
 * Usage: node scripts/viewFirestoreData.js
 */

require('dotenv').config();
const { initializeFirebase } = require('../src/config/firebase');
const { admin } = require('../src/config/firebase');

const USERS_COLLECTION = 'users';
const NUTRITION_PLANS_SUBCOLLECTION = 'nutritionPlans';

async function viewAllData() {
  console.log('\n🔍 Fetching Firestore Data...\n');
  console.log('=' .repeat(80));

  try {
    // Initialize Firebase
    initializeFirebase();
    const db = admin.firestore();

    // Get all users
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();

    if (usersSnapshot.empty) {
      console.log('📭 No users found in Firestore.\n');
      return;
    }

    console.log(`\n👥 Found ${usersSnapshot.size} user(s)\n`);

    // Iterate through each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      console.log('─'.repeat(80));
      console.log(`\n📄 User Document ID: ${userId}`);
      console.log('\nUser Profile:');
      console.log(JSON.stringify(userData, null, 2));

      // Get nutrition plans for this user
      const plansSnapshot = await db
        .collection(USERS_COLLECTION)
        .doc(userId)
        .collection(NUTRITION_PLANS_SUBCOLLECTION)
        .get();

      if (!plansSnapshot.empty) {
        console.log(`\n🍎 Nutrition Plans (${plansSnapshot.size}):`);
        
        plansSnapshot.docs.forEach((planDoc, index) => {
          const planData = planDoc.data();
          console.log(`\n  Plan ${index + 1} (ID: ${planDoc.id}):`);
          console.log(`  ├─ Preset: ${planData.presetName || 'Custom Plan'}`);
          console.log(`  ├─ Active: ${planData.isActive ? '✓' : '✗'}`);
          
          if (planData.createdAt) {
            const createdDate = planData.createdAt.toDate ? planData.createdAt.toDate() : new Date(planData.createdAt);
            console.log(`  ├─ Created: ${createdDate.toLocaleString()}`);
          }
          
          if (planData.updatedAt) {
            const updatedDate = planData.updatedAt.toDate ? planData.updatedAt.toDate() : new Date(planData.updatedAt);
            console.log(`  ├─ Updated: ${updatedDate.toLocaleString()}`);
          }

          // Show metrics tracked
          const metrics = planData.metrics || {};
          const metricKeys = Object.keys(metrics);
          
          if (metricKeys.length > 0) {
            console.log(`  └─ Metrics Tracked (${metricKeys.length}):`);
            metricKeys.forEach((metricId, idx) => {
              const metric = metrics[metricId];
              const isLast = idx === metricKeys.length - 1;
              const prefix = isLast ? '     └─' : '     ├─';
              
              const target = metric.target || 'Not set';
              console.log(`${prefix}    • ${metricId}: ${target} ${metric.unit}`);
            });
          } else {
            console.log(`  └─ Metrics Tracked: None`);
          }

          // Show raw JSON if detailed flag is set
          if (process.argv.includes('--raw') || process.argv.includes('-r')) {
            console.log('\n  Raw Data:');
            console.log('  ' + JSON.stringify(planData, null, 4).replace(/\n/g, '\n  '));
          }
        });
      } else {
        console.log('\n🍎 Nutrition Plans: None');
      }

      console.log('');
    }

    console.log('=' .repeat(80));
    console.log('\n✅ Done!\n');
    console.log('💡 Tip: Use --raw or -r flag to see raw JSON data');
    console.log('   Example: node scripts/viewFirestoreData.js --raw\n');

  } catch (error) {
    console.error('\n❌ Error fetching data:', error.message);
    console.error(error);
  }

  process.exit(0);
}

// Run the script
viewAllData();

