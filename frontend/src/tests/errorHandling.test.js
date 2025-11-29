/**
 * Test suite for Error Handling Bug
 * Bug: Generic "Failed to fetch" errors provide no actionable information to users
 * 
 * This test reproduces the bug where network failures, auth errors, and validation
 * errors all show the same unhelpful "Failed to fetch" message instead of
 * user-friendly, actionable error messages.
 */

import { 
  saveMealLog, 
  getMealLogs, 
  updateMealLog, 
  deleteMealLog 
} from '../services/mealLogService';

describe('Error Handling Bug - HW11', () => {
  beforeEach(() => {
    // Reset fetch mock before each test
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Network Failure Errors', () => {
    it('should show unhelpful error when network is down', async () => {
      // Simulate network failure
      global.fetch.mockRejectedValue(new Error('Network request failed'));

      try {
        await getMealLogs({}, 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Generic message doesn't help user understand the problem
        // Expected: "Unable to connect. Please check your internet connection."
        // Actual: "Failed to fetch meal logs" or raw network error
        expect(error.message).toContain('Failed to fetch');
      }
    });

    it('should show unhelpful error when API times out', async () => {
      global.fetch.mockRejectedValue(new Error('Request timeout'));

      try {
        await saveMealLog({ mealType: 'Lunch' }, 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Timeout should suggest user retry, not just "failed"
        expect(error.message).toMatch(/failed|timeout/i);
      }
    });
  });

  describe('Authentication Errors', () => {
    it('should show unhelpful 401 error message', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      });

      try {
        await getMealLogs({}, 'expired-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Should tell user to log in again, not generic "failed"
        // Expected: "Your session has expired. Please log in again."
        // Actual: "Failed to fetch meal logs"
        expect(error.message).toBe('Failed to fetch meal logs');
      }
    });

    it('should show unhelpful 403 error message', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' })
      });

      try {
        await deleteMealLog('meal-123', 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Should explain user doesn't have permission
        // Expected: "You don't have permission to delete this meal."
        // Actual: "Failed to delete meal log"
        expect(error.message).toContain('Failed to delete');
      }
    });
  });

  describe('Validation Errors', () => {
    it('should show unhelpful 400 validation error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ 
          error: 'Validation failed',
          details: 'Meal type is required'
        })
      });

      try {
        await saveMealLog({ items: [] }, 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Validation errors should show specific field issues
        // Expected: "Meal type is required"
        // Actual: "Failed to save meal log"
        expect(error.message).toContain('Failed to save');
      }
    });
  });

  describe('Server Errors', () => {
    it('should show unhelpful 500 error message', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });

      try {
        await getMealLogs({}, 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: Should suggest user try again later
        // Expected: "Something went wrong on our end. Please try again later."
        // Actual: "Failed to fetch meal logs"
        expect(error.message).toBe('Failed to fetch meal logs');
      }
    });

    it('should handle JSON parsing errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      try {
        await updateMealLog('meal-123', { rating: 5 }, 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // BUG: JSON parse errors leak technical details to users
        expect(error.message).toBeTruthy();
      }
    });
  });

  describe('Missing Error Messages', () => {
    it('should have default message when server returns no error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}) // No error field
      });

      try {
        await deleteMealLog('nonexistent-id', 'fake-token');
        fail('Should have thrown an error');
      } catch (error) {
        // Current behavior: Falls back to generic message
        expect(error.message).toBeTruthy();
      }
    });
  });
});

/**
 * TEST QUALITY ASSESSMENT:
 * 
 * Strengths:
 * - Tests multiple error categories (network, auth, validation, server)
 * - Covers different HTTP status codes (401, 403, 400, 500, 404)
 * - Tests edge cases like JSON parsing failures
 * - Documents expected vs. actual behavior
 * 
 * Limitations:
 * - Mocks fetch so doesn't test real network conditions
 * - Doesn't test UI components that display these errors
 * - Doesn't verify error messages are user-friendly (just that they exist)
 * - No testing of retry logic or error recovery
 * 
 * Recommendation for improvement:
 * - Add E2E tests with network throttling to test real conditions
 * - Add React component tests to verify errors display properly in UI
 * - Test error boundary behavior when errors bubble up
 * 
 * Filed as sub-issue: "Add E2E tests for error message display in UI"
 */
