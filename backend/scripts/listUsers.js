/**
 * Script to list all users and their roles
 * 
 * Usage:
 *   node scripts/listUsers.js [max-results]
 * 
 * Example:
 *   node scripts/listUsers.js 20
 */

const { admin, initializeFirebase } = require('../src/config/firebase');

const listUsers = async (maxResults = 10) => {
  try {
    // Initialize Firebase
    initializeFirebase();

    console.log(`\n📋 Listing up to ${maxResults} users...\n`);

    // List users
    const listUsersResult = await admin.auth().listUsers(maxResults);

    if (listUsersResult.users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log('─'.repeat(80));
    listUsersResult.users.forEach((userRecord) => {
      const customClaims = userRecord.customClaims || {};
      const roles = customClaims.roles || [];

      console.log(`Email: ${userRecord.email}`);
      console.log(`UID: ${userRecord.uid}`);
      console.log(`Name: ${userRecord.displayName || 'N/A'}`);
      console.log(`Roles: ${roles.length > 0 ? roles.join(', ') : 'None'}`);
      console.log(`Disabled: ${userRecord.disabled ? 'Yes' : 'No'}`);
      console.log(`Created: ${new Date(userRecord.metadata.creationTime).toLocaleString()}`);
      console.log(`Last Sign In: ${userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).toLocaleString() : 'Never'}`);
      console.log('─'.repeat(80));
    });

    console.log(`\nTotal users: ${listUsersResult.users.length}`);

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    process.exit(1);
  }

  process.exit(0);
};

// Get command line arguments
const args = process.argv.slice(2);
const maxResults = args[0] ? parseInt(args[0], 10) : 10;

if (isNaN(maxResults) || maxResults <= 0) {
  console.error('Error: max-results must be a positive number');
  process.exit(1);
}

listUsers(maxResults);

