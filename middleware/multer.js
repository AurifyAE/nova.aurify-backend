import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config();

// Initialize the S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Sharp processing and converting image to WebP format before uploading
const sharpProcess = async (buffer) => {
  return sharp(buffer)
    .resize({ width: 800 }) // Resize the image (adjust size as needed)
    .toFormat('webp', { quality: 50 }) // Convert to WebP with quality of 50
    .toBuffer();
};

// Multer-S3 configuration
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  metadata: function (req, file, cb) {
    cb(null, { fieldName: file.fieldname });
  },
  key: function (req, file, cb) {
    cb(null, `${Date.now().toString()}-${file.originalname.split('.')[0]}.webp`);
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});

// Local storage configuration
const localStorageDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(localStorageDir)) {
  fs.mkdirSync(localStorageDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, localStorageDir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now().toString()}-${file.originalname.split('.')[0]}.webp`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const fileTypes = ['jpeg', 'jpg', 'png', 'gif','webp'];
  const extname = file.originalname.split('.').pop().toLowerCase();
  const mimeType = file.mimetype.split('/').pop().toLowerCase();

  if (fileTypes.includes(extname) && fileTypes.includes(mimeType)) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only images are allowed (jpeg, jpg, png, gif)!'));
  }
};

// Create multer upload instances for S3 and local storage
const s3Upload = multer({
  storage: s3Storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB file size limit
  fileFilter: fileFilter
});

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB file size limit
  fileFilter: fileFilter
});

// Single file upload middleware with option for local or S3 storage
export const uploadSingle = (fieldName, useLocalStorage = false) => {
  if (useLocalStorage) {
    return (req, res, next) => {
      localUpload.single(fieldName)(req, res, async (err) => {
        if (err) {
          return next(err);
        }
        if (!req.file) {
          return next();
        }
        try {
          const buffer = await fs.promises.readFile(req.file.path);
          const processedBuffer = await sharpProcess(buffer);
          await fs.promises.writeFile(req.file.path, processedBuffer);
          next();
        } catch (error) {
          next(error);
        }
      });
    };
  } else {
    return s3Upload.single(fieldName);
  }
};

// Multiple file upload middleware with option for local or S3 storage
export const uploadMultiple = (fieldName, maxCount, useLocalStorage = false) => {
  if (useLocalStorage) {
    return (req, res, next) => {
      localUpload.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) {
          return next(err);
        }
        if (!req.files || req.files.length === 0) {
          return next();
        }
        try {
          for (const file of req.files) {
            const buffer = await fs.promises.readFile(file.path);
            const processedBuffer = await sharpProcess(buffer);
            await fs.promises.writeFile(file.path, processedBuffer);
          }
          next();
        } catch (error) {
          next(error);
        }
      });
    };
  } else {
    return s3Upload.array(fieldName, maxCount);
  }
};