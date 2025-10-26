#!/usr/bin/env node

/**
 * Interactive Firebase setup helper
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔥 Firebase Authentication Setup\n');
console.log('I found your Firebase project: huds-nutrition-analyzer');
console.log('Web API Key: AIzaSyDEQ1HK5xfdkLq5ObrpIx2_gO4sNNQRtwM\n');

console.log('To complete setup, I need your Firebase Admin SDK credentials.\n');
console.log('📋 Steps to get your service account key:\n');
console.log('1. Go to https://console.firebase.google.com/');
console.log('2. Select project: "huds-nutrition-analyzer"');
console.log('3. Click ⚙️  (Settings) → Project Settings');
console.log('4. Go to "Service Accounts" tab');
console.log('5. Click "Generate new private key"');
console.log('6. Click "Generate key" - a JSON file will download\n');

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

const setupFromJSON = async () => {
  const answer = await question('Do you have the service account JSON file? (yes/no): ');
  
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    const filePath = await question('Enter the path to your serviceAccountKey.json file: ');
    const resolvedPath = filePath.trim().replace(/^~/, process.env.HOME);
    
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      
      // Create .env file
      const envContent = `# Firebase Configuration
FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"
FIREBASE_WEB_API_KEY=AIzaSyDEQ1HK5xfdkLq5ObrpIx2_gO4sNNQRtwM

# Server Configuration
PORT=3000
NODE_ENV=development
`;

      fs.writeFileSync(path.join(__dirname, '.env'), envContent);
      
      console.log('\n✅ .env file created successfully!\n');
      console.log('🚀 Starting the authentication server...\n');
      
      rl.close();
      
      // Start the server
      require('./src/index.js');
      
    } catch (error) {
      console.error('\n❌ Error reading service account file:', error.message);
      console.log('\nPlease make sure the file path is correct and the file is valid JSON.\n');
      rl.close();
      process.exit(1);
    }
  } else {
    console.log('\n📝 Please download the service account JSON file first, then run:');
    console.log('   node setup-firebase.js\n');
    rl.close();
    process.exit(0);
  }
};

// Check if .env already exists
if (fs.existsSync(path.join(__dirname, '.env'))) {
  question('\n⚠️  .env file already exists. Overwrite it? (yes/no): ').then(answer => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      setupFromJSON();
    } else {
      console.log('\n✅ Keeping existing .env file.\n');
      console.log('🚀 Starting the authentication server...\n');
      rl.close();
      require('./src/index.js');
    }
  });
} else {
  setupFromJSON();
}

