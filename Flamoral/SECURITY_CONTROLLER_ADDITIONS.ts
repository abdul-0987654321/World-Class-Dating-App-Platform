// ============================================================================
// ADDITIONS FOR security.controller.ts
// ============================================================================

// 1. UPDATE IMPORTS (Line 1-4)
// Change from:
// import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Req } from '@nestjs/common';
// import { Request } from 'express';

// To:
import { Controller, Post, Get, Body, Logger, HttpCode, HttpStatus, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

// 2. ADD THIS METHOD AFTER reportSecurityEvent (after line 148, before closing brace)

/**
 * Serve security.txt for responsible disclosure
 * @see RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html
 */
@Public()
@Get('.well-known/security.txt')
@ApiOperation({
  summary: 'Get security.txt',
  description: 'Returns security.txt for responsible vulnerability disclosure per RFC 9116',
})
@ApiResponse({
  status: 200,
  description: 'Security.txt content',
  content: {
    'text/plain': {
      schema: {
        type: 'string',
      },
    },
  },
})
getSecurityTxt(@Res() res: Response): void {
  const securityTxt = `# Security Policy for Flamoral.com
# This file follows RFC 9116: https://www.rfc-editor.org/rfc/rfc9116.html

Contact: mailto:security@flamoral.com
Contact: https://flamoral.com/security/report
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://flamoral.com/.well-known/security.txt

# Security Acknowledgments
Acknowledgments: https://flamoral.com/security/hall-of-fame

# Policy
Policy: https://flamoral.com/security/disclosure-policy

# Encryption
# Encryption: https://flamoral.com/.well-known/pgp-key.txt

# Scope
# This security policy applies to:
# - flamoral.com
# - app.flamoral.com
# - api.flamoral.com
# - All subdomains of flamoral.com

# Please report security vulnerabilities responsibly.
# We aim to respond to security reports within 48 hours.
`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
  res.send(securityTxt);
}
