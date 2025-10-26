/**
 * Script to set custom claims (roles) for a user
 * 
 * Usage:
 *   node scripts/setUserRole.js <user-email> <role1,role2,...>
 * 
 * Example:
 *   node scripts/setUserRole.js user@example.com admin,user
 */

const { admin, initializeFirebase } = require('../src/config/firebase');

const setUserRole = async (email, roles) => {
  try {
    // Initialize Firebase
    initializeFirebase();

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${userRecord.uid} (${userRecord.email})`);

    // Parse roles
    const roleArray = roles.split(',').map(r => r.trim()).filter(r => r.length > 0);

    if (roleArray.length === 0) {
      console.error('❌ Error: No valid roles provided');
      process.exit(1);
    }

    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      roles: roleArray,
    });

    console.log(`✅ Successfully set roles for ${email}:`, roleArray);
    console.log('\nNote: User must re-authenticate to receive new claims in their token.');

  } catch (error) {
    console.error('❌ Error setting user role:', error.message);
    process.exit(1);
  }

  process.exit(0);
};

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node scripts/setUserRole.js <user-email> <role1,role2,...>');
  console.error('Example: node scripts/setUserRole.js user@example.com admin,user');
  process.exit(1);
}

const [email, roles] = args;
setUserRole(email, roles);

