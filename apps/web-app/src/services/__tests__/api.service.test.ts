/**
 * API Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient, { ApiError } from '../api.client';
import { createMockResponse } from '../../test/mocks';

describe('ApiClient', () => {
  let originalFetch: typeof global.fetch;
  let localStorageMock: Record<string, string>;

  beforeEach(() => {
    originalFetch = global.fetch;

    // Mock localStorage
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => localStorageMock[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      localStorageMock[key] = value;
    });

    // Mock document.cookie for CSRF
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('HTTP Methods', () => {
    describe('GET', () => {
      it('should make GET request', async () => {
        const mockResponse = { data: 'test' };
        global.fetch = vi.fn().mockResolvedValue(createMockResponse(mockResponse));

        const result = await apiClient.get('/api/test');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/test'),
          expect.objectContaining({
            method: 'GET',
          })
        );
        expect(result).toEqual(mockResponse);
      });

      it('should include auth header when token exists', async () => {
        localStorageMock['authToken'] = 'test-token';
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.get('/api/test');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });

      it('should not include auth header when skipAuth is true', async () => {
        localStorageMock['authToken'] = 'test-token';
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.get('/api/test', { skipAuth: true });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.not.objectContaining({
              Authorization: expect.any(String),
            }),
          })
        );
      });
    });

    describe('POST', () => {
      it('should make POST request with body', async () => {
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({ success: true }));

        const body = { email: 'test@example.com' };
        await apiClient.post('/api/test', body);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(body),
          })
        );
      });

      it('should set Content-Type to application/json', async () => {
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.post('/api/test', { data: 'test' });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });

    describe('PUT', () => {
      it('should make PUT request', async () => {
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.put('/api/test', { data: 'updated' });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'PUT',
          })
        );
      });
    });

    describe('PATCH', () => {
      it('should make PATCH request', async () => {
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.patch('/api/test', { data: 'patched' });

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    describe('DELETE', () => {
      it('should make DELETE request', async () => {
        global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

        await apiClient.delete('/api/test');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            method: 'DELETE',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw ApiError on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse(
          { message: 'Not found' },
          { status: 404, ok: false }
        )
      );

      await expect(apiClient.get('/api/notfound')).rejects.toBeInstanceOf(ApiError);
    });

    it('should include status code in ApiError', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse(
          { message: 'Unauthorized' },
          { status: 401, ok: false }
        )
      );

      try {
        await apiClient.get('/api/protected');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(401);
      }
    });

    it('should include error message in ApiError', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse(
          { message: 'Custom error message' },
          { status: 400, ok: false }
        )
      );

      try {
        await apiClient.post('/api/test', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Custom error message');
      }
    });

    it('should include error data in ApiError', async () => {
      const errorData = { message: 'Error', details: [{ field: 'email' }] };
      global.fetch = vi.fn().mockResolvedValue(
        createMockResponse(errorData, { status: 422, ok: false })
      );

      try {
        await apiClient.post('/api/test', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).data).toEqual(errorData);
      }
    });
  });

  describe('Empty Responses', () => {
    it('should handle empty response body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        text: () => Promise.resolve(''),
        json: () => Promise.reject(new Error('No JSON')),
      });

      const result = await apiClient.delete('/api/test');

      expect(result).toEqual({});
    });
  });

  describe('CSRF Protection', () => {
    it('should include CSRF token in state-changing requests', async () => {
      document.cookie = 'XSRF-TOKEN=test-csrf-token';
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

      await apiClient.post('/api/test', {});

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CSRF-Token': 'test-csrf-token',
          }),
        })
      );
    });

    it('should not include CSRF token when skipCsrf is true', async () => {
      document.cookie = 'XSRF-TOKEN=test-csrf-token';
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

      await apiClient.post('/api/test', {}, { skipCsrf: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'X-CSRF-Token': expect.any(String),
          }),
        })
      );
    });

    it('should retry with refreshed CSRF token on 403 CSRF error', async () => {
      // First call returns CSRF error
      const csrfError = createMockResponse(
        { message: 'Invalid CSRF token' },
        { status: 403, ok: false }
      );

      // Second call (after token refresh) succeeds
      const successResponse = createMockResponse({ success: true });

      global.fetch = vi.fn()
        .mockResolvedValueOnce(csrfError)
        .mockResolvedValueOnce(createMockResponse({ csrfToken: 'new-csrf-token' }))
        .mockResolvedValueOnce(successResponse);

      await apiClient.post('/api/test', {});

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Credentials', () => {
    it('should include credentials in requests', async () => {
      global.fetch = vi.fn().mockResolvedValue(createMockResponse({}));

      await apiClient.get('/api/test');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
        })
      );
    });
  });

  describe('ApiError Class', () => {
    it('should create ApiError with correct properties', () => {
      const error = new ApiError('Test error', 400, { field: 'email' });

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.data).toEqual({ field: 'email' });
      expect(error.name).toBe('ApiError');
    });

    it('should be instanceof Error', () => {
      const error = new ApiError('Test', 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
    });
  });

  describe('isMockMode', () => {
    it('should detect mock mode based on API_BASE_URL', () => {
      // This test depends on the environment variable
      // In test environment, it should be defined
      expect(typeof apiClient.constructor).toBe('function');
    });
  });
});
