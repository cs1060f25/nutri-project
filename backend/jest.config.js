module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  verbose: true,
  watchman: false,
};

