#!/usr/bin/env node

/**
 * Quick test to check if Firebase is configured correctly
 */

require('dotenv').config();

console.log('\n🔍 Checking Firebase Configuration...\n');

const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_WEB_API_KEY'
];

let allPresent = true;

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`  ✅ ${varName}`);
  } else {
    console.log(`  ❌ ${varName} - MISSING`);
    allPresent = false;
  }
});

if (!allPresent) {
  console.log('\n❌ Missing Firebase credentials!\n');
  console.log('Run this to set up Firebase:');
  console.log('  node setup-firebase.js\n');
  process.exit(1);
}

console.log('\n✅ All Firebase credentials are present!\n');
console.log('Testing Firebase initialization...\n');

try {
  const { initializeFirebase } = require('./src/config/firebase');
  initializeFirebase();
  
  console.log('✅ Firebase Admin SDK initialized successfully!\n');
  console.log('🎉 Your authentication service is ready!\n');
  console.log('To start the server, run:');
  console.log('  npm run dev\n');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.log('\nPlease check your credentials in the .env file.\n');
  process.exit(1);
}

