/**
 * Jest setup file to silence console.error during tests
 * This prevents error messages from cluttering test output
 */

// Store original console.error
const originalError = console.error;

// Mock console.error to suppress output during tests
beforeAll(() => {
  console.error = jest.fn();
});

// Restore original console.error after all tests
afterAll(() => {
  console.error = originalError;
});
