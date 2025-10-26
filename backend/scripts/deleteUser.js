/**
 * Script to delete a user by email
 * 
 * Usage:
 *   node scripts/deleteUser.js <user-email>
 * 
 * Example:
 *   node scripts/deleteUser.js user@example.com
 */

const { admin, initializeFirebase } = require('../src/config/firebase');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askConfirmation = (question) => {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
};

const deleteUser = async (email) => {
  try {
    // Initialize Firebase
    initializeFirebase();

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`\nFound user:`);
    console.log(`  Email: ${userRecord.email}`);
    console.log(`  UID: ${userRecord.uid}`);
    console.log(`  Name: ${userRecord.displayName || 'N/A'}`);

    // Ask for confirmation
    const confirmed = await askConfirmation('\n⚠️  Are you sure you want to delete this user? (yes/no): ');

    if (!confirmed) {
      console.log('❌ Deletion cancelled.');
      rl.close();
      process.exit(0);
    }

    // Delete the user
    await admin.auth().deleteUser(userRecord.uid);
    console.log(`✅ Successfully deleted user: ${email}`);

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ Error: User with email '${email}' not found.`);
    } else {
      console.error('❌ Error deleting user:', error.message);
    }
    rl.close();
    process.exit(1);
  }

  rl.close();
  process.exit(0);
};

// Get command line arguments
const args = process.argv.slice(2);

if (args.length < 1) {
  console.error('Usage: node scripts/deleteUser.js <user-email>');
  console.error('Example: node scripts/deleteUser.js user@example.com');
  process.exit(1);
}

const [email] = args;
deleteUser(email);

