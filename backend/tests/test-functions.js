#!/usr/bin/env node

/**
 * Test core functions without Firebase
 */

console.log('🧪 Testing core functions...\n');

// Test error mapper
console.log('📝 Testing Error Mapper...');
const { mapFirebaseError, createErrorResponse } = require('../src/utils/errorMapper');

const testCases = [
  { input: 'auth/email-already-exists', expected: { statusCode: 409, errorCode: 'EMAIL_ALREADY_EXISTS' } },
  { input: 'auth/wrong-password', expected: { statusCode: 401, errorCode: 'INVALID_CREDENTIALS' } },
  { input: 'auth/weak-password', expected: { statusCode: 400, errorCode: 'WEAK_PASSWORD' } },
  { input: 'auth/user-disabled', expected: { statusCode: 423, errorCode: 'ACCOUNT_LOCKED' } },
  { input: 'unknown-error', expected: { statusCode: 500, errorCode: 'INTERNAL' } },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ input, expected }) => {
  const result = mapFirebaseError(input);
  if (result.statusCode === expected.statusCode && result.errorCode === expected.errorCode) {
    console.log(`  ✅ ${input} → ${expected.errorCode} (${expected.statusCode})`);
    passed++;
  } else {
    console.log(`  ❌ ${input} → Expected ${expected.errorCode}, got ${result.errorCode}`);
    failed++;
  }
});

// Test error response creator
const errorResponse = createErrorResponse('TEST_ERROR', 'This is a test');
if (errorResponse.error && errorResponse.error.code === 'TEST_ERROR') {
  console.log('  ✅ createErrorResponse works correctly');
  passed++;
} else {
  console.log('  ❌ createErrorResponse failed');
  failed++;
}

// Test route structure
console.log('\n🛣️  Testing Route Structure...');
const authRoutes = require('../src/routes/authRoutes');
console.log('  ✅ Auth routes loaded successfully');
passed++;

// Test controller structure
console.log('\n🎮 Testing Controller Structure...');
const authController = require('../src/controllers/authController');
const requiredMethods = ['register', 'login', 'refresh', 'logout', 'getCurrentUser'];
requiredMethods.forEach(method => {
  if (typeof authController[method] === 'function') {
    console.log(`  ✅ authController.${method}() exists`);
    passed++;
  } else {
    console.log(`  ❌ authController.${method}() missing`);
    failed++;
  }
});

// Test middleware structure
console.log('\n🛡️  Testing Middleware Structure...');
const { verifyToken } = require('../src/middleware/authMiddleware');
if (typeof verifyToken === 'function') {
  console.log('  ✅ verifyToken middleware exists');
  passed++;
} else {
  console.log('  ❌ verifyToken middleware missing');
  failed++;
}

// Test service structure
console.log('\n🔧 Testing Service Structure...');
const { signInWithPassword, refreshIdToken } = require('../src/services/firebaseAuthService');
if (typeof signInWithPassword === 'function' && typeof refreshIdToken === 'function') {
  console.log('  ✅ Firebase auth service functions exist');
  passed++;
} else {
  console.log('  ❌ Firebase auth service functions missing');
  failed++;
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 Test Results:');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ❌ Failed: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n🎉 All tests passed! The backend structure is ready.');
 
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Please check the errors above.\n');
  process.exit(1);
}

