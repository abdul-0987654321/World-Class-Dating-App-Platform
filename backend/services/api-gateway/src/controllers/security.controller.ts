import { Controller, Post, Body, Logger, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';

import { Public } from '../decorators/public.decorator';

/**
 * CSP Violation Report Interface
 */
interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer?: string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    disposition: string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code': number;
    'script-sample'?: string;
  };
}

/**
 * Security Controller
 * Handles security-related endpoints including CSP violation reporting
 */
@ApiTags('security')
@Controller('security')
export class SecurityController {
  private readonly logger = new Logger(SecurityController.name);

  /**
   * CSP Violation Reporting Endpoint
   * Receives and logs Content Security Policy violations
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_report_syntax
   */
  @Public()
  @Post('csp-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Report CSP violations',
    description: 'Endpoint for browsers to report Content Security Policy violations',
  })
  @ApiResponse({
    status: 204,
    description: 'CSP violation report received successfully',
  })
  async reportCSPViolation(@Body() report: CSPViolationReport, @Req() req: Request): Promise<void> {
    try {
      const violation = report['csp-report'];

      // Log the violation with detailed information
      this.logger.warn('CSP Violation Detected', {
        documentUri: violation['document-uri'],
        violatedDirective: violation['violated-directive'],
        effectiveDirective: violation['effective-directive'],
        blockedUri: violation['blocked-uri'],
        sourceFile: violation['source-file'],
        lineNumber: violation['line-number'],
        columnNumber: violation['column-number'],
        disposition: violation.disposition,
        statusCode: violation['status-code'],
        scriptSample: violation['script-sample'],
        referrer: violation.referrer,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });

      // In production, you might want to:
      // 1. Store violations in a database for analysis
      // 2. Send alerts for critical violations
      // 3. Aggregate violations for security dashboard
      // 4. Track violation trends

      // Example: Store in database (implement as needed)
      // await this.cspViolationRepository.save({
      //   documentUri: violation['document-uri'],
      //   violatedDirective: violation['violated-directive'],
      //   blockedUri: violation['blocked-uri'],
      //   ...
      // });

      // Example: Send alert for critical violations
      if (this.isCriticalViolation(violation)) {
        this.logger.error('CRITICAL CSP Violation', {
          violation,
          userAgent: req.headers['user-agent'],
        });
        // await this.alertService.sendSecurityAlert('Critical CSP Violation', violation);
      }
    } catch (error) {
      // Don't throw errors for CSP reports to avoid disrupting the browser
      this.logger.error('Error processing CSP violation report', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Determine if a CSP violation is critical
   */
  private isCriticalViolation(violation: CSPViolationReport['csp-report']): boolean {
    const criticalDirectives = ['script-src', 'default-src', 'frame-ancestors'];

    const effectiveDirective = violation['effective-directive'];
    return criticalDirectives.some((directive) => effectiveDirective.startsWith(directive));
  }

  /**
   * Health check endpoint for security monitoring
   */
  @Public()
  @Post('security-report')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Report security events',
    description: 'Generic security event reporting endpoint',
  })
  async reportSecurityEvent(@Body() event: any, @Req() req: Request): Promise<void> {
    try {
      this.logger.warn('Security Event Reported', {
        event,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
        ip: req.ip || req.connection.remoteAddress,
      });
    } catch (error) {
      this.logger.error('Error processing security event report', {
        error: error.message,
      });
    }
  }
}
