/**
 * Password Reset - Focused Unit Tests
 * Tests critical functionality and edge cases for password reset
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResetPassword from '../pages/ResetPassword';
import Auth from '../pages/Auth';
import { AuthProvider } from '../context/AuthContext';
import {
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode,
} from 'firebase/auth';

// Mock Firebase
jest.mock('firebase/auth');
jest.mock('../config/firebase', () => ({ auth: {} }));

const mockNavigate = jest.fn();
let mockSearchParams = new URLSearchParams({ oobCode: 'test-code' });
const getSearchParams = () => mockSearchParams;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [getSearchParams()],
}));

describe('Forgot Password - Critical Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('displays forgot password form and accepts email input', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    // Navigate to forgot password
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    // Verify form elements
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument();
  });

  test('prevents submission with empty email', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter your email address')).toBeInTheDocument();
    });

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test('successfully sends reset email with valid input', async () => {
    sendPasswordResetEmail.mockResolvedValue();

    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'user@example.com',
        expect.any(Object)
      );
      expect(screen.getByText(/Password reset email sent/)).toBeInTheDocument();
    });
  });

  test('displays appropriate error for non-existent user', async () => {
    sendPasswordResetEmail.mockRejectedValue({
      code: 'auth/user-not-found',
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    
    const emailInput = screen.getByLabelText('Email Address');
    fireEvent.change(emailInput, { target: { value: 'nonexistent@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    await waitFor(() => {
      expect(screen.getByText('No account found with this email address.')).toBeInTheDocument();
    });
  });

  test('allows user to navigate back to login', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.getByText('Reset Password')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });
});

describe('Password Reset Form - Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPasswordResetCode.mockResolvedValue('user@example.com');
  });

  test('validates password minimum length', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: '12345' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  test('validates passwords match', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  test('prevents submission with empty passwords', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText('Please fill in all fields')).toBeInTheDocument();
    });

    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  test('accepts valid password and submits', async () => {
    confirmPasswordReset.mockResolvedValue();

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'ValidPass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(confirmPasswordReset).toHaveBeenCalledWith(
        expect.anything(),
        'test-code',
        'ValidPass123'
      );
      expect(screen.getByText(/Password reset successful/)).toBeInTheDocument();
    });
  });
});

describe('Reset Link Verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows loading state while verifying code', () => {
    verifyPasswordResetCode.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('user@example.com'), 1000))
    );

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    expect(screen.getByText('Verifying Reset Link...')).toBeInTheDocument();
  });

  test('displays email after successful verification', async () => {
    verifyPasswordResetCode.mockResolvedValue('verified@example.com');

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(verifyPasswordResetCode).toHaveBeenCalledWith(expect.anything(), 'test-code');
      expect(screen.getByText('for verified@example.com')).toBeInTheDocument();
    });
  });

  test('handles missing reset code', async () => {
    mockSearchParams = new URLSearchParams({});

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Invalid or missing reset code.')).toBeInTheDocument();
      expect(screen.getByText('Return to Login')).toBeInTheDocument();
    });

    // Reset for other tests
    mockSearchParams = new URLSearchParams({ oobCode: 'test-code' });
  });

  test('handles expired reset link', async () => {
    verifyPasswordResetCode.mockRejectedValue({
      code: 'auth/expired-action-code',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This password reset link has expired/)).toBeInTheDocument();
    });
  });

  test('handles invalid or used reset link', async () => {
    verifyPasswordResetCode.mockRejectedValue({
      code: 'auth/invalid-action-code',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/This password reset link is invalid or has already been used/)).toBeInTheDocument();
    });
  });

  test('navigates back to login from error state', async () => {
    verifyPasswordResetCode.mockRejectedValue({
      code: 'auth/expired-action-code',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Return to Login' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Return to Login' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

describe('Password Reset Submission - Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPasswordResetCode.mockResolvedValue('user@example.com');
  });

  const submitValidPassword = async () => {
    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));
  };

  test('handles weak password error', async () => {
    confirmPasswordReset.mockRejectedValue({
      code: 'auth/weak-password',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await submitValidPassword();

    await waitFor(() => {
      expect(screen.getByText('Password is too weak. Please use a stronger password.')).toBeInTheDocument();
    });

    // Ensure form is re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).not.toBeDisabled();
    });
  });

  test('handles expired code during password change', async () => {
    confirmPasswordReset.mockRejectedValue({
      code: 'auth/expired-action-code',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await submitValidPassword();

    await waitFor(() => {
      expect(screen.getByText('This reset link has expired. Please request a new one.')).toBeInTheDocument();
    });

    // Ensure form is re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).not.toBeDisabled();
    });
  });

  test('handles already used code', async () => {
    confirmPasswordReset.mockRejectedValue({
      code: 'auth/invalid-action-code',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await submitValidPassword();

    await waitFor(() => {
      expect(screen.getByText('This reset link is invalid or has already been used.')).toBeInTheDocument();
    });

    // Ensure form is re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).not.toBeDisabled();
    });
  });

  test('handles generic errors gracefully', async () => {
    confirmPasswordReset.mockRejectedValue({
      code: 'auth/network-error',
      message: 'Network error',
    });

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await submitValidPassword();

    await waitFor(() => {
      expect(screen.getByText('Failed to reset password. Please try again.')).toBeInTheDocument();
    });

    // Ensure form is re-enabled after error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Reset Password' })).not.toBeDisabled();
    });
  });
});

describe('UI/UX - Loading and Disabled States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    verifyPasswordResetCode.mockResolvedValue('user@example.com');
  });

  test('disables form during password reset submission', async () => {
    confirmPasswordReset.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    const passwordInput = screen.getByLabelText('New Password');
    const confirmInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByRole('button', { name: 'Reset Password' });

    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(passwordInput).toBeDisabled();
      expect(confirmInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Resetting Password...')).toBeInTheDocument();
    });
  });

  test('disables form during forgot password submission', async () => {
    sendPasswordResetEmail.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <BrowserRouter>
        <AuthProvider>
          <Auth />
        </AuthProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    const emailInput = screen.getByLabelText('Email Address');
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });
});

describe('Navigation and User Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    verifyPasswordResetCode.mockResolvedValue('user@example.com');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('redirects to login after successful password reset', async () => {
    confirmPasswordReset.mockResolvedValue();

    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText('New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm New Password'), {
      target: { value: 'newpassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(screen.getByText(/Password reset successful! Redirecting to login/)).toBeInTheDocument();
    });

    // Fast forward the 2 second timeout
    jest.advanceTimersByTime(2000);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('allows manual navigation back to login', async () => {
    render(
      <BrowserRouter>
        <ResetPassword />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '← Back to Login' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '← Back to Login' }));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});

