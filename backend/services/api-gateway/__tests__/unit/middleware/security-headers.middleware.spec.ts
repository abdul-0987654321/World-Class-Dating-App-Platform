import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

import { SecurityHeadersMiddleware } from '../../../src/middleware/security-headers.middleware';

describe('SecurityHeadersMiddleware', () => {
  let middleware: SecurityHeadersMiddleware;
  let configService: jest.Mocked<ConfigService>;

  const createMockRequest = (path: string = '/api/v1/test'): Request => {
    return {
      path,
      method: 'GET',
      headers: {},
    } as Request;
  };

  const createMockResponse = (): Response => {
    const headers: Record<string, string> = {};
    return {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
      }),
      getHeader: (name: string) => headers[name],
    } as unknown as Response;
  };

  const createMockNext = (): NextFunction => jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset NODE_ENV
    process.env.NODE_ENV = 'test';

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const config: Record<string, any> = {
          CSP_REPORT_URI: '/api/v1/security/csp-report',
          API_DOMAIN: 'https://api.flamoral.com',
        };
        return config[key];
      }),
    } as unknown as jest.Mocked<ConfigService>;

    middleware = new SecurityHeadersMiddleware(configService);
  });

  describe('X-Frame-Options', () => {
    it('should set X-Frame-Options to DENY', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
  });

  describe('X-Content-Type-Options', () => {
    it('should set X-Content-Type-Options to nosniff', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });
  });

  describe('X-XSS-Protection', () => {
    it('should set X-XSS-Protection to 1; mode=block', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });
  });

  describe('Referrer-Policy', () => {
    it('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });
  });

  describe('Content-Security-Policy', () => {
    it('should set Content-Security-Policy header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.any(String)
      );
    });

    it('should include default-src directive', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain("default-src 'self'");
    });

    it('should include frame-ancestors none directive', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain("frame-ancestors 'none'");
    });

    it('should include object-src none directive', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain("object-src 'none'");
    });

    it('should include upgrade-insecure-requests directive', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('upgrade-insecure-requests');
    });

    it('should allow wss for connect-src', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('wss:');
    });
  });

  describe('Strict-Transport-Security (HSTS)', () => {
    it('should set HSTS header in production', () => {
      process.env.NODE_ENV = 'production';

      const prodMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      prodMiddleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    });

    it('should not set HSTS header in development', () => {
      process.env.NODE_ENV = 'development';

      const devMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      devMiddleware.use(req, res, next);

      const hstsCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Strict-Transport-Security'
      );
      expect(hstsCall).toBeUndefined();
    });
  });

  describe('Permissions-Policy', () => {
    it('should set Permissions-Policy header', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.any(String));
    });

    it('should allow camera for video calls', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('camera=(self)');
    });

    it('should allow microphone for video/voice calls', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('microphone=(self)');
    });

    it('should allow geolocation for location-based matching', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('geolocation=(self)');
    });

    it('should allow payment APIs for subscriptions', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('payment=(self)');
    });

    it('should disable USB access', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('usb=()');
    });

    it('should disable interest-cohort (FLoC/Topics API)', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const ppCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Permissions-Policy'
      );
      expect(ppCall[1]).toContain('interest-cohort=()');
    });
  });

  describe('Cross-Origin headers', () => {
    it('should set Cross-Origin-Embedder-Policy', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Embedder-Policy',
        'unsafe-none'
      );
    });

    it('should set Cross-Origin-Opener-Policy', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        'same-origin-allow-popups'
      );
    });

    it('should set Cross-Origin-Resource-Policy', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-site');
    });
  });

  describe('Additional security headers', () => {
    it('should set X-Permitted-Cross-Domain-Policies to none', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        'X-Permitted-Cross-Domain-Policies',
        'none'
      );
    });

    it('should set X-Download-Options to noopen', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
    });
  });

  describe('Sensitive endpoint cache control', () => {
    const sensitiveEndpoints = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/user/profile',
      '/api/v1/password/reset',
      '/api/v1/token/refresh',
      '/api/v1/payment/process',
      '/api/v1/subscription/create',
      '/api/v1/admin/dashboard',
    ];

    sensitiveEndpoints.forEach((path) => {
      it(`should set no-cache headers for ${path}`, () => {
        const req = createMockRequest(path);
        const res = createMockResponse();
        const next = createMockNext();

        middleware.use(req, res, next);

        expect(res.setHeader).toHaveBeenCalledWith(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, private'
        );
        expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
        expect(res.setHeader).toHaveBeenCalledWith('Expires', '0');
      });
    });

    it('should not set strict cache headers for non-sensitive endpoints', () => {
      const req = createMockRequest('/api/v1/public/health');
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      const cacheControlCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Cache-Control'
      );
      expect(cacheControlCall).toBeUndefined();
    });
  });

  describe('Middleware flow', () => {
    it('should call next() after setting headers', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should set all required headers before calling next', () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      middleware.use(req, res, next);

      // Check minimum required security headers
      const setHeaderMock = res.setHeader as jest.Mock;
      const headerNames = setHeaderMock.mock.calls.map((call) => call[0]);

      expect(headerNames).toContain('X-Frame-Options');
      expect(headerNames).toContain('X-Content-Type-Options');
      expect(headerNames).toContain('X-XSS-Protection');
      expect(headerNames).toContain('Content-Security-Policy');
      expect(headerNames).toContain('Referrer-Policy');
      expect(headerNames).toContain('Permissions-Policy');
    });
  });

  describe('Development vs Production CSP', () => {
    it('should allow unsafe-inline and unsafe-eval in development', () => {
      process.env.NODE_ENV = 'development';

      const devMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      devMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain("'unsafe-inline'");
      expect(cspCall[1]).toContain("'unsafe-eval'");
    });

    it('should not allow unsafe-eval in production', () => {
      process.env.NODE_ENV = 'production';

      const prodMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      prodMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).not.toContain("'unsafe-eval'");
    });

    it('should include report-uri in production CSP', () => {
      process.env.NODE_ENV = 'production';

      const prodMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      prodMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('report-uri');
    });

    it('should allow localhost in development connect-src', () => {
      process.env.NODE_ENV = 'development';

      const devMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      devMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('http://localhost:*');
      expect(cspCall[1]).toContain('ws://localhost:*');
    });
  });

  describe('Configuration', () => {
    it('should use custom CSP report URI from config', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'CSP_REPORT_URI') return '/custom/csp-report';
        return undefined;
      });

      process.env.NODE_ENV = 'production';

      const customMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('/custom/csp-report');
    });

    it('should use custom API domain from config', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'API_DOMAIN') return 'https://custom-api.example.com';
        return undefined;
      });

      const customMiddleware = new SecurityHeadersMiddleware(configService);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      customMiddleware.use(req, res, next);

      const cspCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCall[1]).toContain('https://custom-api.example.com');
    });
  });
});
