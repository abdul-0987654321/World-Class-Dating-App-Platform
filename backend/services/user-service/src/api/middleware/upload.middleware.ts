import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

import fileValidationUtil from '../../utils/file-validation.util';
import logger from '../../utils/logger';

// Configure multer to use memory storage
// Files will be available as Buffer in req.file.buffer
const storage = multer.memoryStorage();

// Initial file filter (basic MIME type check)
// Full validation happens in security middleware
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, WebP, GIF images and MP4 videos are allowed.')
    );
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max (validated per type later)
    files: 1, // Only one file at a time
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('photo');

// Middleware for multiple file uploads (up to 9 photos)
export const uploadMultiple = upload.array('photos', 9);

/**
 * Security middleware for file validation
 * Performs magic number checking and malware scanning
 */
export const validateUploadedFile = (fileType: 'image' | 'video') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
      }

      // Perform comprehensive security check
      const validationResult = fileValidationUtil.performSecurityCheck(
        file.buffer,
        file.originalname,
        file.mimetype,
        fileType
      );

      if (!validationResult.isValid) {
        logger.warn('File upload rejected', {
          filename: file.originalname,
          size: file.size,
          declaredType: file.mimetype,
          error: validationResult.error,
        });

        return res.status(400).json({
          success: false,
          error: validationResult.error,
        });
      }

      // Update file metadata with validated information
      file.mimetype = validationResult.mimeType!;

      // Sanitize filename
      const sanitizedFilename = fileValidationUtil.sanitizeFilename(file.originalname);
      file.originalname = sanitizedFilename;

      logger.info('File validated successfully', {
        filename: sanitizedFilename,
        size: file.size,
        type: validationResult.fileType,
        mimeType: validationResult.mimeType,
      });

      next();
    } catch (error: any) {
      logger.error('File validation error', error);
      return res.status(500).json({
        success: false,
        error: 'File validation failed',
      });
    }
  };
};

/**
 * Middleware for validating multiple uploaded files
 */
export const validateUploadedFiles = (fileType: 'image' | 'video') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
      }

      // Validate each file
      for (const file of files) {
        const validationResult = fileValidationUtil.performSecurityCheck(
          file.buffer,
          file.originalname,
          file.mimetype,
          fileType
        );

        if (!validationResult.isValid) {
          logger.warn('File upload rejected', {
            filename: file.originalname,
            size: file.size,
            declaredType: file.mimetype,
            error: validationResult.error,
          });

          return res.status(400).json({
            success: false,
            error: `File ${file.originalname}: ${validationResult.error}`,
          });
        }

        // Update file metadata
        file.mimetype = validationResult.mimeType!;
        file.originalname = fileValidationUtil.sanitizeFilename(file.originalname);
      }

      logger.info('All files validated successfully', {
        count: files.length,
      });

      next();
    } catch (error: any) {
      logger.error('File validation error', error);
      return res.status(500).json({
        success: false,
        error: 'File validation failed',
      });
    }
  };
};
