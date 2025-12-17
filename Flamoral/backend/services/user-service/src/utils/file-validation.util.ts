import logger from './logger';

export interface FileValidationResult {
  isValid: boolean;
  fileType?: string;
  mimeType?: string;
  error?: string;
}

/**
 * Magic numbers (file signatures) for allowed file types
 * First bytes of files that identify their type
 */
const FILE_SIGNATURES: { [key: string]: { bytes: number[][]; mime: string; ext: string } } = {
  // JPEG
  jpeg: {
    bytes: [[0xff, 0xd8, 0xff]],
    mime: 'image/jpeg',
    ext: 'jpg',
  },
  // PNG
  png: {
    bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    mime: 'image/png',
    ext: 'png',
  },
  // GIF
  gif: {
    bytes: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    mime: 'image/gif',
    ext: 'gif',
  },
  // WebP
  webp: {
    bytes: [[0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50]], // RIFF....WEBP
    mime: 'image/webp',
    ext: 'webp',
  },
  // BMP
  bmp: {
    bytes: [[0x42, 0x4d]],
    mime: 'image/bmp',
    ext: 'bmp',
  },
  // MP4 Video
  mp4: {
    bytes: [
      [0x00, 0x00, 0x00, null, 0x66, 0x74, 0x79, 0x70], // ....ftyp
    ],
    mime: 'video/mp4',
    ext: 'mp4',
  },
};

const ALLOWED_IMAGE_TYPES = ['jpeg', 'png', 'gif', 'webp'];
const ALLOWED_VIDEO_TYPES = ['mp4'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

class FileValidationUtil {
  /**
   * Validate file by checking magic numbers (file signature)
   */
  validateFile(buffer: Buffer, declaredMimeType?: string): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      return {
        isValid: false,
        error: 'Empty file buffer',
      };
    }

    // Check file signature
    const detectedType = this.detectFileType(buffer);

    if (!detectedType) {
      logger.warn('Unknown file type detected', {
        firstBytes: Array.from(buffer.slice(0, 16)),
      });
      return {
        isValid: false,
        error: 'Unsupported file type. Only images (JPEG, PNG, GIF, WebP) and MP4 videos are allowed.',
      };
    }

    // Verify declared MIME type matches detected type
    if (declaredMimeType && declaredMimeType !== detectedType.mime) {
      logger.warn('MIME type mismatch detected', {
        declared: declaredMimeType,
        detected: detectedType.mime,
      });
      return {
        isValid: false,
        error: 'File type mismatch. The file content does not match the declared type.',
      };
    }

    return {
      isValid: true,
      fileType: detectedType.ext,
      mimeType: detectedType.mime,
    };
  }

  /**
   * Validate image file
   */
  validateImage(buffer: Buffer, declaredMimeType?: string): FileValidationResult {
    // Check file size
    if (buffer.length > MAX_IMAGE_SIZE) {
      return {
        isValid: false,
        error: `Image file too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.`,
      };
    }

    const result = this.validateFile(buffer, declaredMimeType);

    if (!result.isValid) {
      return result;
    }

    // Verify it's an allowed image type
    if (!ALLOWED_IMAGE_TYPES.includes(result.fileType!)) {
      return {
        isValid: false,
        error: 'Invalid image type. Only JPEG, PNG, GIF, and WebP images are allowed.',
      };
    }

    return result;
  }

  /**
   * Validate video file
   */
  validateVideo(buffer: Buffer, declaredMimeType?: string): FileValidationResult {
    // Check file size
    if (buffer.length > MAX_VIDEO_SIZE) {
      return {
        isValid: false,
        error: `Video file too large. Maximum size is ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.`,
      };
    }

    const result = this.validateFile(buffer, declaredMimeType);

    if (!result.isValid) {
      return result;
    }

    // Verify it's an allowed video type
    if (!ALLOWED_VIDEO_TYPES.includes(result.fileType!)) {
      return {
        isValid: false,
        error: 'Invalid video type. Only MP4 videos are allowed.',
      };
    }

    return result;
  }

  /**
   * Detect file type by checking magic numbers
   */
  private detectFileType(buffer: Buffer): { ext: string; mime: string } | null {
    for (const [type, signature] of Object.entries(FILE_SIGNATURES)) {
      for (const bytes of signature.bytes) {
        if (this.matchesSignature(buffer, bytes)) {
          return {
            ext: signature.ext,
            mime: signature.mime,
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if buffer matches file signature
   */
  private matchesSignature(buffer: Buffer, signature: (number | null)[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      // null means "any byte" (wildcard)
      if (signature[i] !== null && buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sanitize filename
   */
  sanitizeFilename(filename: string): string {
    // Remove path traversal attempts
    const sanitized = filename.replace(/[/\\]/g, '');

    // Remove potentially dangerous characters
    return sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  /**
   * Generate safe filename with timestamp
   */
  generateSafeFilename(originalName: string, userId: string): string {
    const ext = originalName.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    return `${userId}_${timestamp}_${random}.${ext}`;
  }

  /**
   * Check for potential malware patterns (basic check)
   */
  scanForMalwarePatterns(buffer: Buffer): { suspicious: boolean; reason?: string } {
    // Check for common executable signatures
    const executableSignatures = [
      [0x4d, 0x5a], // PE/EXE
      [0x7f, 0x45, 0x4c, 0x46], // ELF
      [0xca, 0xfe, 0xba, 0xbe], // Mach-O
      [0x50, 0x4b, 0x03, 0x04], // ZIP (could contain executables)
    ];

    for (const sig of executableSignatures) {
      if (this.matchesSignature(buffer, sig)) {
        return {
          suspicious: true,
          reason: 'File appears to be an executable or archive',
        };
      }
    }

    // Check for PHP code patterns
    const phpPattern = Buffer.from('<?php');
    if (buffer.indexOf(phpPattern) !== -1) {
      return {
        suspicious: true,
        reason: 'File contains PHP code',
      };
    }

    // Check for script patterns
    const scriptPatterns = ['<script', 'javascript:', 'onerror=', 'onload='];
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));

    for (const pattern of scriptPatterns) {
      if (content.toLowerCase().includes(pattern)) {
        return {
          suspicious: true,
          reason: 'File contains potentially malicious script content',
        };
      }
    }

    return { suspicious: false };
  }

  /**
   * Comprehensive file security check
   */
  performSecurityCheck(
    buffer: Buffer,
    filename: string,
    declaredMimeType: string,
    fileType: 'image' | 'video'
  ): FileValidationResult {
    // 1. Validate file type and size
    const validationResult =
      fileType === 'image'
        ? this.validateImage(buffer, declaredMimeType)
        : this.validateVideo(buffer, declaredMimeType);

    if (!validationResult.isValid) {
      return validationResult;
    }

    // 2. Check for malware patterns
    const malwareScan = this.scanForMalwarePatterns(buffer);
    if (malwareScan.suspicious) {
      logger.warn('Suspicious file detected', {
        filename,
        reason: malwareScan.reason,
      });
      return {
        isValid: false,
        error: `File rejected for security reasons: ${malwareScan.reason}`,
      };
    }

    // 3. Validate filename
    if (filename.length > 255) {
      return {
        isValid: false,
        error: 'Filename too long',
      };
    }

    return validationResult;
  }
}

export const fileValidationUtil = new FileValidationUtil();
export default fileValidationUtil;
