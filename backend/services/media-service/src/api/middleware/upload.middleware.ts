import multer from 'multer';
import config from '../../config';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter
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
