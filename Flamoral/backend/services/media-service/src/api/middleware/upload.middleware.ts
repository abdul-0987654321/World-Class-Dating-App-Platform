import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import config from '../../config';
import fileValidationUtil from '../../utils/file-validation.util';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('upload-middleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter (basic MIME type check - full validation happens later)
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check mime type
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${config.upload.allowedMimeTypes.join(', ')}`));
  }
};

// Create multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 1, // Single file upload
  },
});

// Multiple files upload
export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxPhotosPerUser,
  },
});

// Video file filter
const videoFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check mime type for video
  if (config.upload.allowedVideoMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid video file type. Allowed: ${config.upload.allowedVideoMimeTypes.join(', ')}`));
  }
};

// Video upload middleware
export const uploadVideo = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: config.upload.maxVideoFileSize,
    files: 1,
  },
});

// Audio file filter
const audioFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check mime type for audio (voice notes)
  const allowedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/x-m4a'];
  if (allowedAudioTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid audio file type. Allowed: ${allowedAudioTypes.join(', ')}`));
  }
};

// Audio upload middleware (for voice notes)
export const uploadAudio = multer({
  storage,
  fileFilter: audioFileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 10MB for voice notes
    files: 1,
  },
});

/**
 * Enhanced file validation middleware with magic number checking
 */
export const validateUploadedFile = (fileType: 'image' | 'video' | 'audio') => {
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
 * Validate multiple uploaded files
 */
export const validateUploadedFiles = (fileType: 'image' | 'video' | 'audio') => {
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
