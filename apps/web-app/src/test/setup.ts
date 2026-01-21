/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */

import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, afterAll } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock Element.scrollIntoView (JSDOM doesn't implement it)
Element.prototype.scrollIntoView = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock fetch globally
global.fetch = vi.fn();

// Mock URL.createObjectURL
URL.createObjectURL = vi.fn(() => 'mock-object-url');
URL.revokeObjectURL = vi.fn();

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    VITE_API_URL: 'http://localhost:3000',
    MODE: 'test',
    DEV: true,
    PROD: false,
    SSR: false,
  },
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
});

// Console error/warning suppression for expected test warnings
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    // Suppress React 18 act() warnings in tests
    const message = args[0]?.toString() || '';
    if (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: An update to') ||
      message.includes('act(...)') ||
      message.includes('Not implemented: navigation')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('CSRF token fetch failed')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
