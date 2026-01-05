import { promisify } from 'util';
import * as zlib from 'zlib';

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const gzip = promisify(zlib.gzip);
const brotliCompress = promisify(zlib.brotliCompress);

export interface CompressionOptions {
  threshold?: number; // Minimum size to compress (bytes)
  level?: number; // Compression level (0-9)
  preferBrotli?: boolean; // Prefer Brotli over Gzip
}

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CompressionMiddleware.name);
  private readonly options: Required<CompressionOptions>;

  constructor(options?: CompressionOptions) {
    this.options = {
      threshold: options?.threshold || 1024, // 1KB
      level: options?.level || 6,
      preferBrotli: options?.preferBrotli !== false,
    };
  }

  async use(req: Request, res: Response, next: NextFunction) {
    // Get accepted encodings from request
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const supportsBrotli = acceptEncoding.includes('br');
    const supportsGzip = acceptEncoding.includes('gzip');

    // Store original methods
    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    // Override send method
    res.send = (body: any): Response => {
      return this.compressAndSend(res, body, originalSend, supportsBrotli, supportsGzip);
    };

    // Override json method
    res.json = (body: any): Response => {
      return this.compressAndSend(
        res,
        JSON.stringify(body),
        originalSend,
        supportsBrotli,
        supportsGzip,
        true
      );
    };

    next();
  }

  private compressAndSend(
    res: Response,
    body: any,
    originalSend: (body: any) => Response,
    supportsBrotli: boolean,
    supportsGzip: boolean,
    isJson: boolean = false
  ): Response {
    // Check if response should be compressed
    if (!this.shouldCompress(res, body)) {
      if (isJson) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalSend(body);
    }

    // Determine compression method
    const useBrotli = this.options.preferBrotli && supportsBrotli;
    const useGzip = !useBrotli && supportsGzip;

    if (!useBrotli && !useGzip) {
      if (isJson) {
        res.setHeader('Content-Type', 'application/json');
      }
      return originalSend(body);
    }

    // Compress asynchronously (non-blocking)
    setImmediate(async () => {
      try {
        const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
        let compressed: Buffer;

        if (useBrotli) {
          compressed = await brotliCompress(buffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: this.options.level,
            },
          });
          res.setHeader('Content-Encoding', 'br');
        } else {
          compressed = await gzip(buffer, { level: this.options.level });
          res.setHeader('Content-Encoding', 'gzip');
        }

        // Set headers
        res.setHeader('Content-Length', compressed.length);
        res.setHeader('Vary', 'Accept-Encoding');

        if (isJson) {
          res.setHeader('Content-Type', 'application/json');
        }

        // Calculate compression ratio
        const originalSize = buffer.length;
        const compressedSize = compressed.length;
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

        this.logger.debug(
          `Compressed response: ${originalSize}B -> ${compressedSize}B (${ratio}% reduction)`
        );

        originalSend.call(res, compressed);
      } catch (error) {
        this.logger.error('Compression error:', error);
        // Fallback to uncompressed
        if (isJson) {
          res.setHeader('Content-Type', 'application/json');
        }
        originalSend.call(res, body);
      }
    });

    // Return response object immediately (compression happens async)
    return res;
  }

  private shouldCompress(res: Response, body: any): boolean {
    // Don't compress if already compressed
    if (res.getHeader('Content-Encoding')) {
      return false;
    }

    // Don't compress if content-type is not compressible
    const contentType = res.getHeader('Content-Type') as string;
    if (contentType && !this.isCompressibleContentType(contentType)) {
      return false;
    }

    // Check size threshold
    const bodySize = Buffer.isBuffer(body) ? body.length : Buffer.byteLength(String(body));

    return bodySize >= this.options.threshold;
  }

  private isCompressibleContentType(contentType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/x-yaml',
      'application/vnd.api+json',
    ];

    return compressibleTypes.some((type) => contentType.includes(type));
  }
}
