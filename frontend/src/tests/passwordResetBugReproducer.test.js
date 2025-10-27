/**
 * Password Reset Domain Authorization Test
 * 
 * Tests domain authorization for password reset using the real Firebase Browser SDK.
 */

import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';

describe('Password Reset - Domain Authorization', () => {
  jest.setTimeout(30000);

  it('should verify domain is authorized in Firebase', async () => {
    const continueUrl = 'https://nutri-project-main.vercel.app/reset-password';
    const testEmail = 'test@gmail.com';
    
    const actionCodeSettings = {
      url: continueUrl,
      handleCodeInApp: false,
    };

    try {
      await sendPasswordResetEmail(auth, testEmail, actionCodeSettings);
      expect(true).toBe(true);
    } catch (error) {
      if (error.code === 'auth/unauthorized-continue-uri') {
        throw new Error('Domain not authorized in Firebase Console. Add nutri-project-main.vercel.app to authorized domains.');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        expect(true).toBe(true);
      } else {
        throw error;
      }
    }
  });
});

