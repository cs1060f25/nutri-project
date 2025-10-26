import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDEQ1HK5xfdkLq5ObrpIx2_gO4sNNQRtwM",
  authDomain: "huds-nutrition-analyzer.firebaseapp.com",
  projectId: "huds-nutrition-analyzer",
  storageBucket: "huds-nutrition-analyzer.firebasestorage.app",
  messagingSenderId: "1074497488681",
  appId: "1:1074497488681:web:8e01be4c1abbaf78a75938",
  measurementId: "G-BFWXBGGCSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;

