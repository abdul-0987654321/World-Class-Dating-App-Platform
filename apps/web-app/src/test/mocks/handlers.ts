/**
 * API Mock Handlers
 * Mock fetch responses for testing
 */

import { vi } from 'vitest';
import {
  mockUser,
  mockLoginResponse,
  mockProfiles,
  mockConversation,
  mockMessage,
  mockEntitlements,
} from './services';

interface MockResponseOptions {
  status?: number;
  ok?: boolean;
  headers?: Record<string, string>;
}

/**
 * Create a mock fetch response
 */
export function createMockResponse<T>(data: T, options: MockResponseOptions = {}): Response {
  const { status = 200, ok = true, headers = {} } = options;

  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    blob: () => Promise.resolve(new Blob([JSON.stringify(data)])),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    formData: () => Promise.resolve(new FormData()),
    clone: function () {
      return this;
    },
    body: null,
    bodyUsed: false,
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
  } as Response;
}

/**
 * Create mock fetch that handles different endpoints
 */
export function createMockFetch() {
  return vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const endpoint = typeof url === 'string' ? url : '';
    const method = options?.method || 'GET';

    // Auth endpoints
    if (endpoint.includes('/auth/login') && method === 'POST') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: mockLoginResponse,
        })
      );
    }

    if (endpoint.includes('/auth/register') && method === 'POST') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: mockLoginResponse,
        })
      );
    }

    if (endpoint.includes('/auth/logout') && method === 'POST') {
      return Promise.resolve(createMockResponse({ success: true }));
    }

    if (endpoint.includes('/auth/me') && method === 'GET') {
      return Promise.resolve(createMockResponse(mockUser));
    }

    if (endpoint.includes('/auth/session') && method === 'GET') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: {
            user: mockUser,
            entitlements: mockEntitlements,
            isAuthenticated: true,
          },
        })
      );
    }

    // CSRF token
    if (endpoint.includes('/csrf/token') && method === 'GET') {
      return Promise.resolve(createMockResponse({ csrfToken: 'mock-csrf-token' }));
    }

    // Discovery endpoints
    if (endpoint.includes('/discovery/recommendations') && method === 'GET') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: { profiles: mockProfiles },
        })
      );
    }

    if (endpoint.includes('/discovery/swipe') && method === 'POST') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: { isMatch: false },
        })
      );
    }

    if (endpoint.includes('/discovery/stats') && method === 'GET') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: {
            remainingLikes: 10,
            remainingSuperLikes: 5,
            remainingBoosts: 1,
          },
        })
      );
    }

    // Messaging endpoints
    if (endpoint.includes('/conversations') && method === 'GET') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: { conversations: [mockConversation] },
        })
      );
    }

    if (endpoint.includes('/messages') && method === 'GET') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: { messages: [mockMessage] },
        })
      );
    }

    if (endpoint.includes('/messages') && method === 'POST') {
      return Promise.resolve(
        createMockResponse({
          success: true,
          data: mockMessage,
        })
      );
    }

    // Profile endpoints
    if (endpoint.includes('/profile') && method === 'GET') {
      return Promise.resolve(createMockResponse(mockUser));
    }

    if (endpoint.includes('/profile') && method === 'PATCH') {
      return Promise.resolve(createMockResponse(mockUser));
    }

    // Default response
    return Promise.resolve(createMockResponse({ success: true }));
  });
}

/**
 * Mock fetch to reject with an error
 */
export function mockFetchError(message: string, status = 500) {
  return vi
    .fn()
    .mockRejectedValue(
      createMockResponse({ message, errorCode: 'TEST_ERROR' }, { status, ok: false })
    );
}

/**
 * Mock fetch for specific scenarios
 */
export const fetchScenarios = {
  loginSuccess: () =>
    vi.fn().mockResolvedValue(
      createMockResponse({
        success: true,
        data: mockLoginResponse,
      })
    ),

  loginFailure: (message = 'Invalid credentials') =>
    vi
      .fn()
      .mockResolvedValue(
        createMockResponse(
          { message, errorCode: 'AUTH_INVALID_CREDENTIALS' },
          { status: 401, ok: false }
        )
      ),

  networkError: () => vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),

  timeout: () => vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')),

  serverError: () =>
    vi
      .fn()
      .mockResolvedValue(
        createMockResponse({ message: 'Internal server error' }, { status: 500, ok: false })
      ),

  rateLimited: (retryAfter = 60) =>
    vi
      .fn()
      .mockResolvedValue(
        createMockResponse({ message: 'Too many requests', retryAfter }, { status: 429, ok: false })
      ),

  unauthorized: () =>
    vi
      .fn()
      .mockResolvedValue(
        createMockResponse(
          { message: 'Unauthorized', errorCode: 'AUTH_TOKEN_EXPIRED' },
          { status: 401, ok: false }
        )
      ),

  validationError: (errors: Record<string, string>) =>
    vi.fn().mockResolvedValue(
      createMockResponse(
        {
          message: 'Validation failed',
          details: Object.entries(errors).map(([field, message]) => ({
            field,
            code: 'VALIDATION_ERROR',
            constraints: { validation: message },
          })),
        },
        { status: 422, ok: false }
      )
    ),
};
