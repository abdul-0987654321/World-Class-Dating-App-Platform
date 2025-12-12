/**
 * SSL Certificate Pinning Configuration for Flamoral Mobile App
 *
 * SECURITY NOTE: This configuration uses public key (SPKI) pinning rather than certificate pinning
 * to allow for certificate rotation without requiring app updates.
 *
 * Pin Generation Instructions:
 * See: SSL_PINNING_SETUP.md for detailed instructions on generating and updating pins
 */

export interface SSLPinConfig {
  hostname: string;
  pins: string[];
  includeSubdomains?: boolean;
}

/**
 * SSL Pin Configuration for all API endpoints
 *
 * IMPORTANT:
 * 1. Pins are SHA-256 hashes of the Subject Public Key Info (SPKI)
 * 2. Always include at least 2 pins: current + backup for rotation
 * 3. Update backup pins 60 days before certificate expiration
 * 4. Never remove all pins at once - always maintain at least one valid pin
 */
export const SSL_PIN_CONFIG: SSLPinConfig[] = [
  {
    hostname: 'api.flamoral.com',
    pins: [
      // Primary certificate pin (REPLACE WITH YOUR ACTUAL PIN)
      'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
      // Backup pin for certificate rotation (REPLACE WITH YOUR ACTUAL BACKUP PIN)
      'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
    ],
    includeSubdomains: false,
  },
  {
    hostname: 'ai.flamoral.com',
    pins: [
      // Primary AI services certificate pin (REPLACE WITH YOUR ACTUAL PIN)
      'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
      // Backup pin for certificate rotation (REPLACE WITH YOUR ACTUAL BACKUP PIN)
      'sha256/DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD=',
    ],
    includeSubdomains: false,
  },
  {
    hostname: 'ws.flamoral.com',
    pins: [
      // WebSocket service certificate pin (REPLACE WITH YOUR ACTUAL PIN)
      'sha256/EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE=',
      // Backup pin for certificate rotation (REPLACE WITH YOUR ACTUAL BACKUP PIN)
      'sha256/FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF=',
    ],
    includeSubdomains: false,
  },
];

/**
 * SSL Pinning Configuration Options
 */
export const SSL_PINNING_OPTIONS = {
  // Enable SSL pinning (set to false for local development only)
  enabled: __DEV__ ? false : true,

  // Pin validation mode
  // 'strict': Fail immediately on pin mismatch
  // 'permissive': Log warnings but allow connection (use only for testing)
  validationMode: __DEV__ ? 'permissive' : 'strict',

  // Enable certificate transparency checks
  certificateTransparency: true,

  // Minimum TLS version
  minTlsVersion: 'TLSv1.2',

  // Allow certificate chain validation
  validateCertificateChain: true,

  // Certificate expiration warning threshold (days)
  expirationWarningDays: 30,
};

/**
 * Get pin configuration for a specific hostname
 */
export function getPinConfigForHostname(hostname: string): SSLPinConfig | undefined {
  return SSL_PIN_CONFIG.find(config => {
    if (config.includeSubdomains) {
      return hostname.endsWith(config.hostname);
    }
    return hostname === config.hostname;
  });
}

/**
 * Validate if hostname requires pinning
 */
export function requiresPinning(hostname: string): boolean {
  return getPinConfigForHostname(hostname) !== undefined;
}

/**
 * Get all pins for a hostname (including backup pins)
 */
export function getPinsForHostname(hostname: string): string[] {
  const config = getPinConfigForHostname(hostname);
  return config?.pins || [];
}

/**
 * Development/Testing domains that bypass pinning
 */
export const PINNING_EXEMPT_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '10.0.2.2', // Android emulator
  '10.0.3.2', // Genymotion emulator
];

/**
 * Check if domain is exempt from pinning
 */
export function isPinningExempt(hostname: string): boolean {
  if (!SSL_PINNING_OPTIONS.enabled) {
    return true;
  }

  return PINNING_EXEMPT_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith(`.${domain}`)
  );
}
