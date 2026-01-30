import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Global Privacy Control (GPC) Middleware
 *
 * Detects the Sec-GPC HTTP header on all incoming requests.
 * Per CCPA/CPRA, when GPC is enabled (Sec-GPC: 1), the platform must
 * treat it as a valid opt-out of sale/sharing of personal information.
 *
 * This middleware:
 * 1. Reads the Sec-GPC header from every request
 * 2. Attaches gpcEnabled flag to the request object for downstream use
 * 3. Sets a response header confirming GPC acknowledgment
 * 4. Logs GPC signal detection for compliance audit trails
 *
 * @see https://globalprivacycontrol.github.io/gpc-spec/
 * @see California Civil Code Section 1798.135(e) (CCPA/CPRA)
 */

// Extend Express Request to carry GPC flag
declare global {
  namespace Express {
    interface Request {
      gpcEnabled?: boolean;
    }
  }
}

@Injectable()
export class GpcMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GpcMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const gpcHeader = req.headers['sec-gpc'];
    const gpcEnabled = gpcHeader === '1';

    // Attach GPC status to request for downstream route handlers
    req.gpcEnabled = gpcEnabled;

    if (gpcEnabled) {
      // Confirm to the client that GPC was acknowledged
      res.setHeader('X-GPC-Acknowledged', '1');

      // Log for compliance audit trail
      this.logger.log({
        event: 'gpc_signal_detected',
        ip: this.getClientIp(req),
        path: req.path,
        method: req.method,
        userId: (req as any).user?.userId || (req as any).user?.sub || 'anonymous',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}
