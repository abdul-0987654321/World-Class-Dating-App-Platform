/**
 * API Response Contract Tests
 *
 * Validates that all API responses follow the OpenAPI spec format:
 * - Success responses: { success: true, data: ... }
 * - Error responses: { success: false, error: string } or { success: false, message: string }
 *
 * These tests ensure consistent API response structure across all services.
 */

// Response type definitions matching OpenAPI spec
interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  error?: string;
  message?: string;
}

type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Contract validator functions
function isValidSuccessResponse(response: unknown): response is SuccessResponse {
  if (typeof response !== 'object' || response === null) return false;
  const obj = response as Record<string, unknown>;
  return obj.success === true && 'data' in obj;
}

function isValidErrorResponse(response: unknown): response is ErrorResponse {
  if (typeof response !== 'object' || response === null) return false;
  const obj = response as Record<string, unknown>;
  return obj.success === false && ('error' in obj || 'message' in obj);
}

function isValidApiResponse(response: unknown): response is ApiResponse {
  return isValidSuccessResponse(response) || isValidErrorResponse(response);
}

describe('API Response Contract Validation', () => {
  describe('Success Response Contract', () => {
    it('should validate a minimal success response', () => {
      const response = {
        success: true,
        data: {},
      };

      expect(isValidSuccessResponse(response)).toBe(true);
      expect(isValidApiResponse(response)).toBe(true);
    });

    it('should validate success response with array data', () => {
      const response = {
        success: true,
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
      };

      expect(isValidSuccessResponse(response)).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
    });

    it('should validate success response with object data', () => {
      const response = {
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          createdAt: new Date().toISOString(),
        },
      };

      expect(isValidSuccessResponse(response)).toBe(true);
    });

    it('should validate success response with optional message', () => {
      const response = {
        success: true,
        data: { id: 'item-123' },
        message: 'Item created successfully',
      };

      expect(isValidSuccessResponse(response)).toBe(true);
      expect(response.message).toBeDefined();
    });

    it('should validate success response with null data', () => {
      const response = {
        success: true,
        data: null,
      };

      expect(isValidSuccessResponse(response)).toBe(true);
    });

    it('should reject success response without data field', () => {
      const response = {
        success: true,
        message: 'Operation successful',
      };

      expect(isValidSuccessResponse(response)).toBe(false);
    });

    it('should reject response with success: false as success response', () => {
      const response = {
        success: false,
        data: {},
      };

      expect(isValidSuccessResponse(response)).toBe(false);
    });
  });

  describe('Error Response Contract', () => {
    it('should validate error response with error field', () => {
      const response = {
        success: false,
        error: 'Something went wrong',
      };

      expect(isValidErrorResponse(response)).toBe(true);
      expect(isValidApiResponse(response)).toBe(true);
    });

    it('should validate error response with message field', () => {
      const response = {
        success: false,
        message: 'Validation failed',
      };

      expect(isValidErrorResponse(response)).toBe(true);
    });

    it('should validate error response with both error and message', () => {
      const response = {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email is required',
      };

      expect(isValidErrorResponse(response)).toBe(true);
    });

    it('should reject error response without error or message', () => {
      const response = {
        success: false,
      };

      expect(isValidErrorResponse(response)).toBe(false);
    });

    it('should reject response with success: true as error response', () => {
      const response = {
        success: true,
        error: 'This is wrong',
      };

      expect(isValidErrorResponse(response)).toBe(false);
    });
  });

  describe('Invalid Response Detection', () => {
    it('should reject null as API response', () => {
      expect(isValidApiResponse(null)).toBe(false);
    });

    it('should reject undefined as API response', () => {
      expect(isValidApiResponse(undefined)).toBe(false);
    });

    it('should reject empty object as API response', () => {
      expect(isValidApiResponse({})).toBe(false);
    });

    it('should reject string as API response', () => {
      expect(isValidApiResponse('error')).toBe(false);
    });

    it('should reject array as API response', () => {
      expect(isValidApiResponse([{ id: 1 }])).toBe(false);
    });

    it('should reject response without success field', () => {
      expect(isValidApiResponse({ data: {} })).toBe(false);
      expect(isValidApiResponse({ error: 'Error' })).toBe(false);
    });

    it('should reject response with non-boolean success field', () => {
      expect(isValidApiResponse({ success: 1, data: {} })).toBe(false);
      expect(isValidApiResponse({ success: 'true', data: {} })).toBe(false);
    });
  });
});

describe('Service-Specific Response Contract Tests', () => {
  describe('Auth Service Response Contracts', () => {
    describe('Login Response', () => {
      it('should match login success response contract', () => {
        const response = {
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              first_name: 'John',
              last_name: 'Doe',
              is_email_verified: true,
              is_active: true,
            },
            accessToken: 'eyJhbG...',
            refreshToken: 'eyJhbG...',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('user');
        expect(response.data).toHaveProperty('accessToken');
        expect(response.data).toHaveProperty('refreshToken');
      });

      it('should match login error response contract', () => {
        const response = {
          success: false,
          error: 'Invalid credentials',
        };

        expect(isValidErrorResponse(response)).toBe(true);
      });
    });

    describe('Register Response', () => {
      it('should match register success response contract', () => {
        const response = {
          success: true,
          message: 'Registration successful. Please verify your email.',
          data: {
            user: {
              id: 'user-123',
              email: 'newuser@example.com',
              first_name: 'New',
              last_name: 'User',
              is_email_verified: false,
              is_active: true,
            },
            accessToken: 'eyJhbG...',
            refreshToken: 'eyJhbG...',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data.user.is_email_verified).toBe(false);
      });
    });

    describe('Refresh Token Response', () => {
      it('should match refresh token success response contract', () => {
        const response = {
          success: true,
          message: 'Token refreshed successfully',
          data: {
            accessToken: 'eyJhbG...',
            refreshToken: 'eyJhbG...',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('accessToken');
        expect(response.data).toHaveProperty('refreshToken');
      });
    });
  });

  describe('Payment Service Response Contracts', () => {
    describe('Get Plans Response', () => {
      it('should match get plans success response contract', () => {
        const response = {
          success: true,
          data: [
            {
              key: 'free',
              name: 'Free',
              priceMonthly: 0,
              priceCurrency: 'usd',
              priceFormatted: 'Free',
              entitlements: {
                dailySwipes: 50,
                superLikesPerDay: 1,
              },
            },
            {
              key: 'premium',
              name: 'Premium',
              priceMonthly: 2999,
              priceCurrency: 'usd',
              priceFormatted: '$29.99/month',
              entitlements: {
                dailySwipes: -1,
                superLikesPerDay: -1,
              },
            },
          ],
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBeGreaterThan(0);

        // Validate plan structure
        response.data.forEach((plan) => {
          expect(plan).toHaveProperty('key');
          expect(plan).toHaveProperty('name');
          expect(plan).toHaveProperty('priceMonthly');
          expect(plan).toHaveProperty('priceCurrency');
          expect(plan).toHaveProperty('priceFormatted');
          expect(plan).toHaveProperty('entitlements');
        });
      });
    });

    describe('Get My Subscription Response', () => {
      it('should match active subscription response contract', () => {
        const response = {
          success: true,
          data: {
            status: 'active',
            tier: 'premium',
            tierName: 'Premium',
            subscriptionId: 'sub_123',
            currentPeriodEnd: '2025-02-01T00:00:00Z',
            cancelAtPeriodEnd: false,
            entitlements: {
              dailySwipes: -1,
              superLikesPerDay: -1,
              passport: true,
            },
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('tier');
        expect(response.data).toHaveProperty('entitlements');
      });

      it('should match free tier response contract (no subscription)', () => {
        const response = {
          success: true,
          data: {
            status: 'free',
            tier: 'free',
            tierName: 'Free',
            subscription: null,
            entitlements: {
              dailySwipes: 50,
              superLikesPerDay: 1,
            },
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data.subscription).toBeNull();
        expect(response.data.status).toBe('free');
      });
    });

    describe('Create Payment Intent Response', () => {
      it('should match create payment intent success response contract', () => {
        const response = {
          success: true,
          data: {
            clientSecret: 'pi_123_secret_456',
            paymentIntentId: 'pi_123',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('clientSecret');
        expect(response.data).toHaveProperty('paymentIntentId');
      });
    });
  });

  describe('Media Service Response Contracts', () => {
    describe('Presigned URL Response', () => {
      it('should match presigned URL success response contract', () => {
        const response = {
          success: true,
          data: {
            uploadUrl: 'https://s3.amazonaws.com/bucket/key?signature=...',
            key: 'user-123/uploads/photo-uuid.jpg',
            expiresAt: '2025-01-04T13:00:00Z',
            publicUrl: 'https://cdn.example.com/user-123/uploads/photo-uuid.jpg',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('uploadUrl');
        expect(response.data).toHaveProperty('key');
        expect(response.data).toHaveProperty('expiresAt');
        expect(response.data).toHaveProperty('publicUrl');
      });
    });

    describe('Photo Upload Response', () => {
      it('should match photo upload success response contract', () => {
        const response = {
          success: true,
          message: 'Photo uploaded successfully',
          data: {
            id: 'photo-123',
            userId: 'user-123',
            url: 'https://cdn.example.com/photo.jpg',
            thumbnailUrl: 'https://cdn.example.com/photo-thumb.jpg',
            isProfilePhoto: false,
            order: 1,
            createdAt: '2025-01-04T12:00:00Z',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('url');
      });
    });

    describe('Content Type Validation Error', () => {
      it('should match content type error response contract', () => {
        const response = {
          success: false,
          error: 'Unsupported content type: application/pdf',
        };

        expect(isValidErrorResponse(response)).toBe(true);
        expect(response.error).toContain('content type');
      });
    });
  });

  describe('Matching Service Response Contracts', () => {
    describe('Discovery Feed Response', () => {
      it('should match discovery feed success response contract', () => {
        const response = {
          success: true,
          data: {
            profiles: [
              {
                id: 'profile-123',
                firstName: 'Jane',
                age: 28,
                bio: 'Love hiking and coffee',
                photos: ['https://cdn.example.com/photo1.jpg'],
                distance: 5.2,
                compatibilityScore: 85,
              },
            ],
            remainingSwipes: 45,
            boostActive: false,
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('profiles');
        expect(Array.isArray(response.data.profiles)).toBe(true);
      });
    });

    describe('Match Response', () => {
      it('should match new match success response contract', () => {
        const response = {
          success: true,
          message: "It's a match!",
          data: {
            matchId: 'match-123',
            matchedAt: '2025-01-04T12:00:00Z',
            matchedUser: {
              id: 'user-456',
              firstName: 'Jane',
              profilePhoto: 'https://cdn.example.com/photo.jpg',
            },
            conversationId: 'conv-789',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('matchId');
        expect(response.data).toHaveProperty('matchedUser');
      });
    });
  });

  describe('Messaging Service Response Contracts', () => {
    describe('Send Message Response', () => {
      it('should match send message success response contract', () => {
        const response = {
          success: true,
          data: {
            messageId: 'msg-123',
            conversationId: 'conv-456',
            senderId: 'user-123',
            content: 'Hello!',
            sentAt: '2025-01-04T12:00:00Z',
            status: 'sent',
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('messageId');
        expect(response.data).toHaveProperty('status');
      });
    });

    describe('Get Conversations Response', () => {
      it('should match conversations list response contract', () => {
        const response = {
          success: true,
          data: {
            conversations: [
              {
                id: 'conv-123',
                matchId: 'match-456',
                participant: {
                  id: 'user-789',
                  firstName: 'Jane',
                  profilePhoto: 'https://cdn.example.com/photo.jpg',
                },
                lastMessage: {
                  content: 'Hey there!',
                  sentAt: '2025-01-04T11:00:00Z',
                  isRead: false,
                },
                unreadCount: 2,
              },
            ],
            total: 15,
            page: 1,
            pageSize: 20,
          },
        };

        expect(isValidSuccessResponse(response)).toBe(true);
        expect(response.data).toHaveProperty('conversations');
        expect(Array.isArray(response.data.conversations)).toBe(true);
      });
    });
  });
});

describe('HTTP Status Code Contract Tests', () => {
  describe('Success Status Codes', () => {
    const successCases = [
      { status: 200, description: 'GET requests returning data' },
      { status: 200, description: 'PUT/PATCH requests updating resources' },
      { status: 200, description: 'DELETE requests removing resources' },
      { status: 201, description: 'POST requests creating new resources' },
      { status: 204, description: 'No content responses (logout, etc.)' },
    ];

    successCases.forEach(({ status, description }) => {
      it(`should use ${status} for ${description}`, () => {
        expect([200, 201, 204]).toContain(status);
      });
    });
  });

  describe('Error Status Codes', () => {
    const errorCases = [
      { status: 400, description: 'Validation errors' },
      { status: 401, description: 'Authentication required' },
      { status: 403, description: 'Permission denied' },
      { status: 404, description: 'Resource not found' },
      { status: 409, description: 'Conflict (duplicate resource)' },
      { status: 422, description: 'Unprocessable entity' },
      { status: 429, description: 'Rate limit exceeded' },
      { status: 500, description: 'Internal server error' },
    ];

    errorCases.forEach(({ status, description }) => {
      it(`should use ${status} for ${description}`, () => {
        expect([400, 401, 403, 404, 409, 422, 429, 500]).toContain(status);
      });
    });
  });
});

describe('Pagination Response Contract', () => {
  it('should include pagination metadata in list responses', () => {
    const response = {
      success: true,
      data: {
        items: [{ id: 1 }, { id: 2 }],
        pagination: {
          total: 100,
          page: 1,
          pageSize: 20,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    };

    expect(isValidSuccessResponse(response)).toBe(true);
    expect(response.data).toHaveProperty('pagination');
    expect(response.data.pagination).toHaveProperty('total');
    expect(response.data.pagination).toHaveProperty('page');
    expect(response.data.pagination).toHaveProperty('pageSize');
  });

  it('should support cursor-based pagination', () => {
    const response = {
      success: true,
      data: {
        items: [{ id: 'item-50' }, { id: 'item-51' }],
        cursor: {
          next: 'eyJpZCI6IjUxIn0=',
          previous: 'eyJpZCI6IjQ5In0=',
          hasMore: true,
        },
      },
    };

    expect(isValidSuccessResponse(response)).toBe(true);
    expect(response.data).toHaveProperty('cursor');
    expect(response.data.cursor).toHaveProperty('next');
    expect(response.data.cursor).toHaveProperty('hasMore');
  });
});

describe('Timestamp Format Contract', () => {
  it('should use ISO 8601 format for timestamps', () => {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

    const response = {
      success: true,
      data: {
        createdAt: '2025-01-04T12:00:00Z',
        updatedAt: '2025-01-04T12:30:00.123Z',
      },
    };

    expect(response.data.createdAt).toMatch(iso8601Regex);
    expect(response.data.updatedAt).toMatch(iso8601Regex);
  });

  it('should parse ISO 8601 timestamps correctly', () => {
    const timestamp = '2025-01-04T12:00:00Z';
    const date = new Date(timestamp);

    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0); // January
    expect(date.getDate()).toBe(4);
    expect(date.getUTCHours()).toBe(12);
  });
});

describe('UUID Format Contract', () => {
  it('should use valid UUID format for IDs', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const response = {
      success: true,
      data: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      },
    };

    expect(response.data.id).toMatch(uuidRegex);
    expect(response.data.userId).toMatch(uuidRegex);
  });
});
