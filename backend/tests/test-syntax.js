#!/usr/bin/env node

/**
 * Simple syntax and structure test
 */

console.log('🧪 Testing backend structure...\n');

const fs = require('fs');
const path = require('path');

// Check all required files exist
const requiredFiles = [
  '../src/index.js',
  '../src/config/firebase.js',
  '../src/controllers/authController.js',
  '../src/middleware/authMiddleware.js',
  '../src/routes/authRoutes.js',
  '../src/services/firebaseAuthService.js',
  '../src/utils/errorMapper.js',
  '../package.json',
  '../Dockerfile',
  '../.gitignore',
];

let allGood = true;

console.log('📁 Checking files...');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  if (exists) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    allGood = false;
  }
});

console.log('\n📦 Checking modules can be required...');

try {
  const errorMapper = require('../src/utils/errorMapper');
  console.log('  ✅ errorMapper.js');
  
  const firebaseConfig = require('../src/config/firebase');
  console.log('  ✅ firebase.js');
  
  const authRoutes = require('../src/routes/authRoutes');
  console.log('  ✅ authRoutes.js');
  
  const authController = require('../src/controllers/authController');
  console.log('  ✅ authController.js');
  
  const authMiddleware = require('../src/middleware/authMiddleware');
  console.log('  ✅ authMiddleware.js');
  
  const firebaseAuthService = require('../src/services/firebaseAuthService');
  console.log('  ✅ firebaseAuthService.js');
  
} catch (error) {
  console.log(`  ❌ Error requiring modules: ${error.message}`);
  allGood = false;
}

console.log('\n📋 Summary:');
if (allGood) {
  console.log('  ✅ All syntax checks passed!');
} else {
  console.log('  ❌ Some checks failed');
  process.exit(1);
}

