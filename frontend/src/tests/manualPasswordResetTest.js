/**
 * Manual Test Script for Password Reset Functionality
 * 
 * This script can be run in the browser console to test the password reset
 * functionality and identify the Firebase domain authorization issue.
 * 
 * Instructions:
 * 1. Open the app in your browser
 * 2. Open the browser's developer console
 * 3. Copy and paste this script into the console
 * 4. Run the test functions
 */

// Test function to simulate password reset with different domains
const testPasswordResetDomains = async () => {
  console.log('🧪 Testing Password Reset Domain Configuration...');
  
  // Import Firebase functions (assuming they're available globally)
  const { sendPasswordResetEmail } = window.firebase?.auth || {};
  const { auth } = window.firebase?.config || {};
  
  if (!sendPasswordResetEmail || !auth) {
    console.error('❌ Firebase not available. Make sure Firebase is loaded.');
    return;
  }
  
  const testEmail = 'test@example.com';
  const domains = [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://nutrition-analyzer.web.app',
    'https://huds-nutrition-analyzer.web.app',
    'https://huds-nutrition-analyzer.firebaseapp.com'
  ];
  
  for (const domain of domains) {
    try {
      console.log(`\n🔍 Testing domain: ${domain}`);
      
      const actionCodeSettings = {
        url: `${domain}/reset-password`,
        handleCodeInApp: false,
      };
      
      await sendPasswordResetEmail(auth, testEmail, actionCodeSettings);
      console.log(`✅ SUCCESS: ${domain} is authorized`);
      
    } catch (error) {
      console.log(`❌ FAILED: ${domain}`);
      console.log(`   Error Code: ${error.code}`);
      console.log(`   Error Message: ${error.message}`);
      
      if (error.code === 'auth/unauthorized-continue-uri') {
        console.log(`   🚨 DOMAIN NOT AUTHORIZED: ${domain} needs to be added to Firebase authorized domains`);
      }
    }
  }
};

// Test function to check current domain configuration
const checkCurrentDomainConfig = () => {
  console.log('🔍 Checking Current Domain Configuration...');
  
  const currentOrigin = window.location.origin;
  const expectedResetUrl = `${currentOrigin}/reset-password`;
  
  console.log(`Current Origin: ${currentOrigin}`);
  console.log(`Expected Reset URL: ${expectedResetUrl}`);
  console.log(`Reset Password Route Exists: ${window.location.pathname === '/reset-password'}`);
  
  // Check if we're in development or production
  const isDevelopment = currentOrigin.includes('localhost');
  const isProduction = currentOrigin.includes('web.app') || currentOrigin.includes('firebaseapp.com');
  
  console.log(`Environment: ${isDevelopment ? 'Development' : isProduction ? 'Production' : 'Unknown'}`);
  
  return {
    currentOrigin,
    expectedResetUrl,
    isDevelopment,
    isProduction
  };
};

// Test function to simulate the exact error from the issue
const simulatePasswordResetError = async () => {
  console.log('🧪 Simulating Password Reset Error...');
  
  try {
    // This will likely fail with the unauthorized-continue-uri error
    const { sendPasswordResetEmail } = window.firebase?.auth || {};
    const { auth } = window.firebase?.config || {};
    
    if (!sendPasswordResetEmail || !auth) {
      throw new Error('Firebase not available');
    }
    
    const testEmail = 'test@example.com';
    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: false,
    };
    
    console.log('Attempting password reset with current domain...');
    console.log('Action Code Settings:', actionCodeSettings);
    
    await sendPasswordResetEmail(auth, testEmail, actionCodeSettings);
    console.log('✅ Password reset successful!');
    
  } catch (error) {
    console.log('❌ Password reset failed as expected');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    if (error.code === 'auth/unauthorized-continue-uri') {
      console.log('\n🚨 ISSUE IDENTIFIED:');
      console.log('The domain is not authorized in Firebase Authentication settings.');
      console.log('To fix this:');
      console.log('1. Go to Firebase Console → Authentication → Settings');
      console.log('2. Add the following domain to "Authorized domains":');
      console.log(`   ${window.location.origin}`);
      console.log('3. Save the changes');
      console.log('4. Test the password reset again');
    }
  }
};

// Test function to verify Firebase project configuration
const checkFirebaseConfig = () => {
  console.log('🔍 Checking Firebase Configuration...');
  
  // Try to get Firebase config from the app
  const firebaseConfig = window.firebase?.config || {};
  
  console.log('Firebase Project ID:', firebaseConfig.projectId);
  console.log('Firebase Auth Domain:', firebaseConfig.authDomain);
  console.log('Firebase API Key:', firebaseConfig.apiKey ? 'Present' : 'Missing');
  
  // Check if we can access Firebase Auth
  const auth = window.firebase?.auth?.auth || window.firebase?.auth;
  if (auth) {
    console.log('Firebase Auth: Available');
    console.log('Current User:', auth.currentUser ? 'Logged in' : 'Not logged in');
  } else {
    console.log('Firebase Auth: Not available');
  }
  
  return firebaseConfig;
};

// Main test runner
const runPasswordResetTests = async () => {
  console.log('🚀 Starting Password Reset Tests...\n');
  
  // Check current domain configuration
  const domainConfig = checkCurrentDomainConfig();
  console.log('\n' + '='.repeat(50));
  
  // Check Firebase configuration
  const firebaseConfig = checkFirebaseConfig();
  console.log('\n' + '='.repeat(50));
  
  // Test current domain
  await simulatePasswordResetError();
  console.log('\n' + '='.repeat(50));
  
  // Test multiple domains
  await testPasswordResetDomains();
  
  console.log('\n🏁 Tests completed!');
  console.log('\n📋 Summary:');
  console.log('If you see "auth/unauthorized-continue-uri" errors,');
  console.log('the domain needs to be added to Firebase authorized domains.');
};

// Export functions for individual testing
window.passwordResetTests = {
  runAll: runPasswordResetTests,
  checkDomain: checkCurrentDomainConfig,
  checkFirebase: checkFirebaseConfig,
  simulateError: simulatePasswordResetError,
  testDomains: testPasswordResetDomains
};

console.log('🧪 Password Reset Test Suite Loaded!');
console.log('Run: passwordResetTests.runAll() to start testing');
console.log('Or run individual tests:');
console.log('- passwordResetTests.checkDomain()');
console.log('- passwordResetTests.checkFirebase()');
console.log('- passwordResetTests.simulateError()');
console.log('- passwordResetTests.testDomains()');
