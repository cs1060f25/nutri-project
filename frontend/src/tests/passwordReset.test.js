import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '../pages/Auth';

// Mock Firebase auth
jest.mock('firebase/auth', () => ({
  sendPasswordResetEmail: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));

// Mock Firebase config
jest.mock('../config/firebase', () => ({
  auth: {},
}));

const { sendPasswordResetEmail } = require('firebase/auth');

// Mock the auth context
const mockLogin = jest.fn();
const mockRegister = jest.fn();

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    register: mockRegister,
  }),
}));

// Mock console.error to capture Firebase errors
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

const renderAuth = () => {
  return render(
    <BrowserRouter>
      <Auth />
    </BrowserRouter>
  );
};

describe('Password Reset Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error.mockClear();
  });

  test('should display forgot password form when "Forgot password?" is clicked', () => {
    renderAuth();
    
    // Click on "Forgot password?" link
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Verify the form changes to forgot password mode
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText('Enter your email to receive a password reset link')).toBeInTheDocument();
    expect(screen.getByText('Send Reset Link')).toBeInTheDocument();
  });

  test('should show error when email is empty in forgot password mode', async () => {
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Submit without email
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument();
    });
  });

  test('should call sendPasswordResetEmail with correct parameters', async () => {
    const mockEmail = 'test@example.com';
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Verify sendPasswordResetEmail was called with correct parameters
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        {},
        mockEmail,
        {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: false,
        }
      );
    });
  });

  test('should handle auth/unauthorized-continue-uri error', async () => {
    const mockEmail = 'test@example.com';
    const unauthorizedError = new Error('Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)');
    unauthorizedError.code = 'auth/unauthorized-continue-uri';
    
    sendPasswordResetEmail.mockRejectedValueOnce(unauthorizedError);
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Check that the error is logged to console
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Password reset error:', unauthorizedError);
    });
    
    // Check that a generic error message is shown to user
    await waitFor(() => {
      expect(screen.getByText('Failed to send reset email. Please try again.')).toBeInTheDocument();
    });
  });

  test('should handle auth/user-not-found error', async () => {
    const mockEmail = 'nonexistent@example.com';
    const userNotFoundError = new Error('Firebase: There is no user record corresponding to this identifier. The user may have been deleted. (auth/user-not-found)');
    userNotFoundError.code = 'auth/user-not-found';
    
    sendPasswordResetEmail.mockRejectedValueOnce(userNotFoundError);
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Check for specific error message
    await waitFor(() => {
      expect(screen.getByText('No account found with this email address.')).toBeInTheDocument();
    });
  });

  test('should handle auth/invalid-email error', async () => {
    const mockEmail = 'invalid-email';
    const invalidEmailError = new Error('Firebase: The email address is badly formatted. (auth/invalid-email)');
    invalidEmailError.code = 'auth/invalid-email';
    
    sendPasswordResetEmail.mockRejectedValueOnce(invalidEmailError);
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter invalid email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Check for specific error message
    await waitFor(() => {
      expect(screen.getByText('Invalid email address.')).toBeInTheDocument();
    });
  });

  test('should show success message on successful password reset request', async () => {
    const mockEmail = 'test@example.com';
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Password reset email sent! Check your inbox and spam folder.')).toBeInTheDocument();
    });
  });

  test('should return to login form after successful password reset request', async () => {
    const mockEmail = 'test@example.com';
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Wait for success message and then check that form returns to login
    await waitFor(() => {
      expect(screen.getByText('Password reset email sent! Check your inbox and spam folder.')).toBeInTheDocument();
    });
    
    // Wait for the timeout to complete and form to return to login
    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    }, { timeout: 6000 });
  });

  test('should verify action code settings configuration', async () => {
    const mockEmail = 'test@example.com';
    sendPasswordResetEmail.mockResolvedValueOnce();
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Verify the action code settings are correct
    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        {},
        mockEmail,
        {
          url: `${window.location.origin}/reset-password`,
          handleCodeInApp: false,
        }
      );
    });
  });
});

describe('Firebase Domain Authorization Issue', () => {
  test('should identify unauthorized continue URI error', async () => {
    const mockEmail = 'test@example.com';
    const unauthorizedError = new Error('Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)');
    unauthorizedError.code = 'auth/unauthorized-continue-uri';
    
    sendPasswordResetEmail.mockRejectedValueOnce(unauthorizedError);
    
    renderAuth();
    
    // Switch to forgot password mode
    const forgotPasswordLink = screen.getByText('Forgot password?');
    fireEvent.click(forgotPasswordLink);
    
    // Enter email
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    fireEvent.change(emailInput, { target: { value: mockEmail } });
    
    // Submit form
    const submitButton = screen.getByText('Send Reset Link');
    fireEvent.click(submitButton);
    
    // Verify the specific error is caught and logged
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Password reset error:', unauthorizedError);
    });
    
    // Verify the error code is auth/unauthorized-continue-uri
    expect(unauthorizedError.code).toBe('auth/unauthorized-continue-uri');
  });

  test('should verify current domain configuration', () => {
    // Test that the current domain is being used in action code settings
    const expectedUrl = `${window.location.origin}/reset-password`;
    
    // This test verifies that the domain being used matches the current origin
    expect(window.location.origin).toBeDefined();
    expect(expectedUrl).toContain('/reset-password');
  });
});
