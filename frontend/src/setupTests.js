// Jest setup file for testing
import '@testing-library/jest-dom';

// Mock window.location for tests (production Vercel environment)
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://nutri-project-main.vercel.app',
    href: 'https://nutri-project-main.vercel.app',
    pathname: '/',
    search: '',
    hash: '',
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;
