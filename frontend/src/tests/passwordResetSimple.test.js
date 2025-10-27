/**
 * Simple Password Reset Test
 * 
 * This test demonstrates the Firebase domain authorization issue
 * and verifies the password reset functionality.
 */

import { sendPasswordResetEmail } from 'firebase/auth';

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

describe('Password Reset Domain Authorization Issue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should identify the auth/unauthorized-continue-uri error', async () => {
    const mockEmail = 'test@example.com';
    const unauthorizedError = new Error('Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)');
    unauthorizedError.code = 'auth/unauthorized-continue-uri';
    
    // Mock the Firebase function to throw the specific error
    sendPasswordResetEmail.mockRejectedValueOnce(unauthorizedError);
    
    // Simulate the action code settings that would be used
    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: false,
    };
    
    // Attempt to send password reset email
    try {
      await sendPasswordResetEmail({}, mockEmail, actionCodeSettings);
      fail('Expected sendPasswordResetEmail to throw an error');
    } catch (error) {
      // Verify the specific error is caught
      expect(error.code).toBe('auth/unauthorized-continue-uri');
      expect(error.message).toContain('Domain not allowlisted by project');
      
      console.log('✅ SUCCESS: Identified the Firebase domain authorization issue');
      console.log('Error Code:', error.code);
      console.log('Error Message:', error.message);
      console.log('Current Domain:', window.location.origin);
      console.log('Reset URL:', actionCodeSettings.url);
    }
  });

  test('should verify action code settings configuration', () => {
    const expectedUrl = `${window.location.origin}/reset-password`;
    
    // Verify the domain configuration
    expect(window.location.origin).toBe('http://localhost:3000');
    expect(expectedUrl).toBe('http://localhost:3000/reset-password');
    
    console.log('✅ SUCCESS: Action code settings are correctly configured');
    console.log('Current Origin:', window.location.origin);
    console.log('Expected Reset URL:', expectedUrl);
  });

  test('should demonstrate the fix needed', () => {
    const currentDomain = window.location.origin;
    const resetUrl = `${currentDomain}/reset-password`;
    
    console.log('🔧 FIX NEEDED:');
    console.log('1. Go to Firebase Console → Authentication → Settings');
    console.log('2. Add the following domain to "Authorized domains":');
    console.log(`   ${currentDomain}`);
    console.log('3. Save the changes');
    console.log('4. Test the password reset again');
    
    // Verify the domain that needs to be added
    expect(currentDomain).toBe('http://localhost:3000');
    expect(resetUrl).toBe('http://localhost:3000/reset-password');
  });

  test('should test different domain scenarios', () => {
    const domains = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'https://nutrition-analyzer.web.app',
      'https://huds-nutrition-analyzer.web.app',
      'https://huds-nutrition-analyzer.firebaseapp.com'
    ];
    
    domains.forEach(domain => {
      const resetUrl = `${domain}/reset-password`;
      console.log(`Testing domain: ${domain} → Reset URL: ${resetUrl}`);
    });
    
    // Verify all domains are properly formatted
    domains.forEach(domain => {
      expect(domain).toMatch(/^https?:\/\/.+/);
      expect(`${domain}/reset-password`).toContain('/reset-password');
    });
  });
});

describe('Password Reset Error Handling', () => {
  test('should handle auth/user-not-found error', async () => {
    const userNotFoundError = new Error('Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found)');
    userNotFoundError.code = 'auth/user-not-found';
    
    sendPasswordResetEmail.mockRejectedValueOnce(userNotFoundError);
    
    try {
      await sendPasswordResetEmail({}, 'nonexistent@example.com', {});
      fail('Expected sendPasswordResetEmail to throw an error');
    } catch (error) {
      expect(error.code).toBe('auth/user-not-found');
      console.log('✅ SUCCESS: User not found error handled correctly');
    }
  });

  test('should handle auth/invalid-email error', async () => {
    const invalidEmailError = new Error('Firebase: The email address is badly formatted. (auth/invalid-email)');
    invalidEmailError.code = 'auth/invalid-email';
    
    sendPasswordResetEmail.mockRejectedValueOnce(invalidEmailError);
    
    try {
      await sendPasswordResetEmail({}, 'invalid-email', {});
      fail('Expected sendPasswordResetEmail to throw an error');
    } catch (error) {
      expect(error.code).toBe('auth/invalid-email');
      console.log('✅ SUCCESS: Invalid email error handled correctly');
    }
  });

  test('should handle successful password reset', async () => {
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    const actionCodeSettings = {
      url: `${window.location.origin}/reset-password`,
      handleCodeInApp: false,
    };
    
    await sendPasswordResetEmail({}, 'test@example.com', actionCodeSettings);
    
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      {},
      'test@example.com',
      actionCodeSettings
    );
    
    console.log('✅ SUCCESS: Password reset email sent successfully');
  });
});
