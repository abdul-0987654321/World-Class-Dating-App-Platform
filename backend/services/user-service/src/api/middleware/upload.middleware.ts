import multer from 'multer';
import { Request } from 'express';

// Configure multer to use memory storage
// Files will be available as Buffer in req.file.buffer
const storage = multer.memoryStorage();

// File filter to only allow images
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.')
    );
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1, // Only one file at a time
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single('photo');

// Middleware for multiple file uploads (up to 9 photos)
export const uploadMultiple = upload.array('photos', 9);
