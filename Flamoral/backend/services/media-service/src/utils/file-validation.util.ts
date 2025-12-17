import { createLogger } from '@flamoral/shared';

const logger = createLogger('file-validation-util');

// Magic number signatures for file type detection
const FILE_SIGNATURES = {
  // Images
  JPEG: [0xff, 0xd8, 0xff],
  PNG: [0x89, 0x50, 0x4e, 0x47],
  GIF: [0x47, 0x49, 0x46, 0x38],
  WEBP: [0x52, 0x49, 0x46, 0x46], // RIFF header, need to check WEBP after
  BMP: [0x42, 0x4d],
  TIFF_LE: [0x49, 0x49, 0x2a, 0x00],
  TIFF_BE: [0x4d, 0x4d, 0x00, 0x2a],
  // Videos
  MP4: [0x00, 0x00, 0x00], // ftyp at bytes 4-8
  AVI: [0x52, 0x49, 0x46, 0x46], // RIFF header, AVI after
  MOV: [0x00, 0x00, 0x00], // Similar to MP4
  WEBM: [0x1a, 0x45, 0xdf, 0xa3],
  // Audio
  MP3: [0xff, 0xfb],
  MP3_ID3: [0x49, 0x44, 0x33], // ID3 tag
  WAV: [0x52, 0x49, 0x46, 0x46],
  M4A: [0x00, 0x00, 0x00],
};

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileType?: string;
  mimeType?: string;
  detectedFormat?: string;
}

class FileValidationUtil {
  /**
   * Check if buffer matches a signature
   */
  private matchesSignature(buffer: Buffer, signature: number[]): boolean {
    if (buffer.length < signature.length) {
      return false;
    }

    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect file type from buffer using magic numbers
   */
  detectFileType(buffer: Buffer): { type: string; mime: string } | null {
    // JPEG
    if (this.matchesSignature(buffer, FILE_SIGNATURES.JPEG)) {
      return { type: 'jpeg', mime: 'image/jpeg' };
    }

    // PNG
    if (this.matchesSignature(buffer, FILE_SIGNATURES.PNG)) {
      return { type: 'png', mime: 'image/png' };
    }

    // GIF
    if (this.matchesSignature(buffer, FILE_SIGNATURES.GIF)) {
      return { type: 'gif', mime: 'image/gif' };
    }

    // WebP
    if (this.matchesSignature(buffer, FILE_SIGNATURES.WEBP)) {
      // Check for WEBP string at bytes 8-11
      if (buffer.length >= 12 && buffer.toString('ascii', 8, 12) === 'WEBP') {
        return { type: 'webp', mime: 'image/webp' };
      }
    }

    // BMP
    if (this.matchesSignature(buffer, FILE_SIGNATURES.BMP)) {
      return { type: 'bmp', mime: 'image/bmp' };
    }

    // TIFF
    if (
      this.matchesSignature(buffer, FILE_SIGNATURES.TIFF_LE) ||
      this.matchesSignature(buffer, FILE_SIGNATURES.TIFF_BE)
    ) {
      return { type: 'tiff', mime: 'image/tiff' };
    }

    // MP4/MOV
    if (this.matchesSignature(buffer, FILE_SIGNATURES.MP4) && buffer.length >= 12) {
      const ftype = buffer.toString('ascii', 4, 8);
      if (ftype === 'ftyp') {
        const brand = buffer.toString('ascii', 8, 12);
        if (brand.startsWith('mp4') || brand.startsWith('iso')) {
          return { type: 'mp4', mime: 'video/mp4' };
        }
        if (brand.startsWith('qt') || brand.startsWith('mov')) {
          return { type: 'mov', mime: 'video/quicktime' };
        }
        if (brand.startsWith('M4A')) {
          return { type: 'm4a', mime: 'audio/m4a' };
        }
      }
    }

    // AVI
    if (this.matchesSignature(buffer, FILE_SIGNATURES.AVI) && buffer.length >= 12) {
      const aviSignature = buffer.toString('ascii', 8, 12);
      if (aviSignature === 'AVI ') {
        return { type: 'avi', mime: 'video/x-msvideo' };
      }
    }

    // WebM
    if (this.matchesSignature(buffer, FILE_SIGNATURES.WEBM)) {
      return { type: 'webm', mime: 'video/webm' };
    }

    // MP3
    if (
      this.matchesSignature(buffer, FILE_SIGNATURES.MP3) ||
      this.matchesSignature(buffer, FILE_SIGNATURES.MP3_ID3)
    ) {
      return { type: 'mp3', mime: 'audio/mpeg' };
    }

    // WAV
    if (this.matchesSignature(buffer, FILE_SIGNATURES.WAV) && buffer.length >= 12) {
      const waveSignature = buffer.toString('ascii', 8, 12);
      if (waveSignature === 'WAVE') {
        return { type: 'wav', mime: 'audio/wav' };
      }
    }

    return null;
  }

  /**
   * Validate file extension matches content
   */
  validateExtension(filename: string, detectedType: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();

    const extensionMap: { [key: string]: string[] } = {
      jpeg: ['jpg', 'jpeg'],
      png: ['png'],
      gif: ['gif'],
      webp: ['webp'],
      bmp: ['bmp'],
      tiff: ['tiff', 'tif'],
      mp4: ['mp4'],
      mov: ['mov'],
      avi: ['avi'],
      webm: ['webm'],
      mp3: ['mp3'],
      wav: ['wav'],
      m4a: ['m4a'],
    };

    const validExtensions = extensionMap[detectedType];
    return validExtensions ? validExtensions.includes(ext || '') : false;
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  sanitizeFilename(filename: string): string {
    // Remove any path components
    let sanitized = filename.replace(/^.*[\\\/]/, '');

    // Remove any non-alphanumeric characters except dots, hyphens, and underscores
    sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Remove any leading dots
    sanitized = sanitized.replace(/^\.+/, '');

    // Limit length
    const maxLength = 255;
    if (sanitized.length > maxLength) {
      const ext = sanitized.split('.').pop();
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, maxLength - (ext?.length || 0) - 1) + '.' + ext;
    }

    return sanitized || 'file';
  }

  /**
   * Check for malicious patterns in file
   */
  checkForMaliciousPatterns(buffer: Buffer): { safe: boolean; reason?: string } {
    const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));

    // Check for PHP tags
    if (content.includes('<?php') || content.includes('<?=')) {
      return { safe: false, reason: 'PHP code detected in file' };
    }

    // Check for script tags
    if (content.includes('<script>') || content.includes('javascript:')) {
      return { safe: false, reason: 'Script code detected in file' };
    }

    // Check for eval patterns
    if (content.match(/eval\s*\(/i)) {
      return { safe: false, reason: 'Eval pattern detected in file' };
    }

    // Check for SQL injection patterns
    if (content.match(/(union|select|insert|update|delete|drop)\s+(all|distinct|from|table)/i)) {
      return { safe: false, reason: 'SQL injection pattern detected' };
    }

    return { safe: true };
  }

  /**
   * Validate image file
   */
  validateImage(buffer: Buffer, filename: string, declaredMimeType: string): FileValidationResult {
    // Detect actual file type
    const detected = this.detectFileType(buffer);

    if (!detected) {
      return {
        isValid: false,
        error: 'Unable to detect file type. File may be corrupted or of an unsupported format.',
      };
    }

    // Check if it's an image
    if (!detected.mime.startsWith('image/')) {
      return {
        isValid: false,
        error: 'File is not a valid image format.',
      };
    }

    // Validate allowed image types
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageTypes.includes(detected.mime)) {
      return {
        isValid: false,
        error: `Image type ${detected.type} is not allowed. Allowed types: JPEG, PNG, WebP, GIF`,
      };
    }

    // Check if extension matches content
    if (!this.validateExtension(filename, detected.type)) {
      return {
        isValid: false,
        error: 'File extension does not match file content',
      };
    }

    // Check for malicious patterns
    const securityCheck = this.checkForMaliciousPatterns(buffer);
    if (!securityCheck.safe) {
      return {
        isValid: false,
        error: `Security check failed: ${securityCheck.reason}`,
      };
    }

    return {
      isValid: true,
      fileType: detected.type,
      mimeType: detected.mime,
      detectedFormat: detected.type,
    };
  }

  /**
   * Validate video file
   */
  validateVideo(buffer: Buffer, filename: string, declaredMimeType: string): FileValidationResult {
    // Detect actual file type
    const detected = this.detectFileType(buffer);

    if (!detected) {
      return {
        isValid: false,
        error: 'Unable to detect file type. File may be corrupted or of an unsupported format.',
      };
    }

    // Check if it's a video
    if (!detected.mime.startsWith('video/')) {
      return {
        isValid: false,
        error: 'File is not a valid video format.',
      };
    }

    // Validate allowed video types
    const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (!allowedVideoTypes.includes(detected.mime)) {
      return {
        isValid: false,
        error: `Video type ${detected.type} is not allowed. Allowed types: MP4, MOV, AVI, WebM`,
      };
    }

    // Check if extension matches content
    if (!this.validateExtension(filename, detected.type)) {
      return {
        isValid: false,
        error: 'File extension does not match file content',
      };
    }

    return {
      isValid: true,
      fileType: detected.type,
      mimeType: detected.mime,
      detectedFormat: detected.type,
    };
  }

  /**
   * Validate audio file
   */
  validateAudio(buffer: Buffer, filename: string, declaredMimeType: string): FileValidationResult {
    // Detect actual file type
    const detected = this.detectFileType(buffer);

    if (!detected) {
      return {
        isValid: false,
        error: 'Unable to detect file type. File may be corrupted or of an unsupported format.',
      };
    }

    // Check if it's audio
    if (!detected.mime.startsWith('audio/')) {
      return {
        isValid: false,
        error: 'File is not a valid audio format.',
      };
    }

    // Validate allowed audio types
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a'];
    if (!allowedAudioTypes.includes(detected.mime)) {
      return {
        isValid: false,
        error: `Audio type ${detected.type} is not allowed. Allowed types: MP3, WAV, M4A`,
      };
    }

    // Check if extension matches content
    if (!this.validateExtension(filename, detected.type)) {
      return {
        isValid: false,
        error: 'File extension does not match file content',
      };
    }

    return {
      isValid: true,
      fileType: detected.type,
      mimeType: detected.mime,
      detectedFormat: detected.type,
    };
  }

  /**
   * Comprehensive security check
   */
  performSecurityCheck(
    buffer: Buffer,
    filename: string,
    declaredMimeType: string,
    expectedType: 'image' | 'video' | 'audio'
  ): FileValidationResult {
    // Sanitize filename first
    const sanitizedFilename = this.sanitizeFilename(filename);

    // Perform type-specific validation
    let result: FileValidationResult;

    switch (expectedType) {
      case 'image':
        result = this.validateImage(buffer, sanitizedFilename, declaredMimeType);
        break;
      case 'video':
        result = this.validateVideo(buffer, sanitizedFilename, declaredMimeType);
        break;
      case 'audio':
        result = this.validateAudio(buffer, sanitizedFilename, declaredMimeType);
        break;
      default:
        return {
          isValid: false,
          error: 'Unknown file type expected',
        };
    }

    if (!result.isValid) {
      logger.warn('File validation failed', {
        filename: sanitizedFilename,
        declaredMimeType,
        expectedType,
        error: result.error,
      });
    }

    return result;
  }
}

export default new FileValidationUtil();
