import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware
 * Implements comprehensive security headers including CSP, X-Frame-Options, etc.
 *
 * @see https://owasp.org/www-project-secure-headers/
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly isDevelopment: boolean;
  private readonly cspReportUri: string;
  private readonly apiDomain: string;

  constructor(private readonly configService: ConfigService) {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.cspReportUri =
      this.configService.get<string>('CSP_REPORT_URI') || '/api/v1/security/csp-report';
    this.apiDomain = this.configService.get<string>('API_DOMAIN') || 'https://api.flamoral.com';
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Content Security Policy (CSP)
    // Prevents XSS, clickjacking, code injection attacks
    const cspDirectives = this.buildCSPDirectives();
    res.setHeader('Content-Security-Policy', cspDirectives);

    // X-Frame-Options: Prevents clickjacking attacks
    // DENY: Page cannot be displayed in a frame, regardless of the site attempting to do so
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options: Prevents MIME type sniffing
    // nosniff: Blocks a request if the request destination is of type style and the MIME type is not text/css,
    // or of type script and the MIME type is not a JavaScript MIME type
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection: Legacy XSS protection (deprecated in modern browsers but still useful for older ones)
    // 1; mode=block: Enables XSS filtering and prevents rendering of the page if attack is detected
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer-Policy: Controls how much referrer information should be included with requests
    // strict-origin-when-cross-origin: Send full URL for same-origin, only origin for cross-origin HTTPS, nothing for HTTP
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions-Policy (formerly Feature-Policy): Controls which browser features can be used
    // Disables dangerous features that aren't needed
    const permissionsPolicy = this.buildPermissionsPolicy();
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // Strict-Transport-Security (HSTS): Forces HTTPS connections
    // max-age=31536000: 1 year
    // includeSubDomains: Apply to all subdomains
    // preload: Allow inclusion in browser preload lists
    if (!this.isDevelopment) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // X-Permitted-Cross-Domain-Policies: Restricts Adobe Flash and PDF cross-domain requests
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // X-Download-Options: Prevents IE from executing downloads in site's context
    res.setHeader('X-Download-Options', 'noopen');

    // Cross-Origin-Embedder-Policy: Controls what resources can be loaded cross-origin
    // For API Gateway, we use 'unsafe-none' to allow embedding
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');

    // Cross-Origin-Opener-Policy: Isolates browsing context
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');

    // Cross-Origin-Resource-Policy: Controls who can load the resource
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');

    // Cache-Control for sensitive endpoints
    if (this.isSensitiveEndpoint(req.path)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  }

  /**
   * Build Content Security Policy directives
   */
  private buildCSPDirectives(): string {
    const directives = {
      'default-src': ["'self'"],
      'script-src': this.isDevelopment
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"] // Allow inline scripts in dev for HMR
        : ["'self'"], // Strict in production - no inline scripts
      'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components
      'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'connect-src': [
        "'self'",
        'wss:',
        'ws:',
        this.apiDomain,
        'https://api.flamoral.com',
        ...(this.isDevelopment ? ['http://localhost:*', 'ws://localhost:*'] : []),
      ],
      'media-src': ["'self'", 'blob:', 'data:', 'https:'],
      'object-src': ["'none'"], // Disable plugins
      'frame-src': ["'none'"], // No frames allowed
      'frame-ancestors': ["'none'"], // Prevents embedding (redundant with X-Frame-Options but more flexible)
      'base-uri': ["'self'"], // Restricts <base> tag URLs
      'form-action': ["'self'"], // Restricts form submission targets
      'manifest-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'child-src': ["'self'", 'blob:'],
      'upgrade-insecure-requests': [], // Automatically upgrade HTTP to HTTPS
      'block-all-mixed-content': [], // Block mixed content
    };

    // Add report-uri in production
    if (!this.isDevelopment) {
      directives['report-uri'] = [this.cspReportUri];
      directives['report-to'] = ['csp-endpoint'];
    }

    // Build directive string
    return Object.entries(directives)
      .map(([key, values]) => {
        if (values.length === 0) {
          return key;
        }
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');
  }

  /**
   * Build Permissions Policy directives
   */
  private buildPermissionsPolicy(): string {
    const policies = {
      camera: ['self'], // Allow camera for video calls
      microphone: ['self'], // Allow microphone for video/voice calls
      geolocation: ['self'], // Allow geolocation for location-based matching
      payment: ['self'], // Allow payment APIs for subscriptions
      usb: ['()'], // Disable USB
      magnetometer: ['()'], // Disable magnetometer
      accelerometer: ['()'], // Disable accelerometer
      gyroscope: ['()'], // Disable gyroscope
      'ambient-light-sensor': ['()'], // Disable ambient light sensor
      autoplay: ['self'], // Allow autoplay for media
      fullscreen: ['self'], // Allow fullscreen for video calls
      'picture-in-picture': ['self'], // Allow PIP for video calls
      'display-capture': ['()'], // Disable screen capture
      'document-domain': ['()'], // Disable document.domain
      'encrypted-media': ['self'], // Allow encrypted media
      'execution-while-not-rendered': ['()'], // Disable background execution
      'execution-while-out-of-viewport': ['()'], // Disable execution when not visible
      midi: ['()'], // Disable MIDI
      'speaker-selection': ['()'], // Disable speaker selection
      'sync-xhr': ['()'], // Disable synchronous XHR
      'interest-cohort': ['()'], // Disable FLoC/Topics API (privacy)
    };

    return Object.entries(policies)
      .map(([key, values]) => {
        const valueStr = values.join(' ');
        return `${key}=(${valueStr})`;
      })
      .join(', ');
  }

  /**
   * Check if endpoint is sensitive and should have strict caching headers
   */
  private isSensitiveEndpoint(path: string): boolean {
    const sensitivePatterns = [
      '/auth',
      '/login',
      '/register',
      '/password',
      '/token',
      '/user',
      '/profile',
      '/payment',
      '/subscription',
      '/admin',
    ];

    return sensitivePatterns.some((pattern) => path.includes(pattern));
  }
}
