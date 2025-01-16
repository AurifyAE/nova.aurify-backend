import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import dotenv from "dotenv";
import ffmpeg from 'fluent-ffmpeg';
dotenv.config();

// Initialize the S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Process image using Sharp
const processImage = async (buffer) => {
  return sharp(buffer)
    .resize({ width: 800 })
    .toFormat('webp', { quality: 50 })
    .toBuffer();
};

// Process video using ffmpeg
const processVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .size('?x720') // 720p height, maintain aspect ratio
      .videoBitrate('1000k')
      .fps(30)
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
};

// Determine file type and extension
const getFileTypeAndExt = (file) => {
  const mimeType = file.mimetype.split('/')[0];
  const extension = file.originalname.split('.').pop().toLowerCase();
  return { mimeType, extension };
};

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['jpeg', 'jpg', 'png', 'gif', 'webp'];
  const allowedVideoTypes = ['mp4', 'mov', 'avi', 'mkv'];
  const { mimeType, extension } = getFileTypeAndExt(file);

  if ((mimeType === 'image' && allowedImageTypes.includes(extension)) ||
      (mimeType === 'video' && allowedVideoTypes.includes(extension))) {
    return cb(null, true);
  }
  cb(new Error('Error: Only images (jpeg, jpg, png, gif, webp) and videos (mp4, mov, avi, mkv) are allowed!'));
};

// Generate output filename
const generateOutputFilename = (file) => {
  const { mimeType } = getFileTypeAndExt(file);
  const timestamp = Date.now().toString();
  const basename = file.originalname.split('.')[0];
  return `${timestamp}-${basename}${mimeType === 'image' ? '.webp' : '.mp4'}`;
};

// S3 storage configuration
const s3Storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    cb(null, generateOutputFilename(file));
  },
  contentType: multerS3.AUTO_CONTENT_TYPE,
});

// Local storage configuration
const localStorageDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(localStorageDir)) {
  fs.mkdirSync(localStorageDir, { recursive: true });
}

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, localStorageDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateOutputFilename(file));
  }
});

// Create multer upload instances
const s3Upload = multer({
  storage: s3Storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB file size limit for videos
  fileFilter: fileFilter
});

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: fileFilter
});

// Process file based on type
const processFile = async (file) => {
  const { mimeType } = getFileTypeAndExt(file);
  
  if (mimeType === 'image') {
    const buffer = await fs.promises.readFile(file.path);
    const processedBuffer = await processImage(buffer);
    await fs.promises.writeFile(file.path, processedBuffer);
  } else if (mimeType === 'video') {
    const tempPath = `${file.path}.temp`;
    await fs.promises.rename(file.path, tempPath);
    await processVideo(tempPath, file.path);
    await fs.promises.unlink(tempPath);
  }
};

// Single file upload middleware
export const uploadSingle = (fieldName, useLocalStorage = false) => {
  if (useLocalStorage) {
    return (req, res, next) => {
      localUpload.single(fieldName)(req, res, async (err) => {
        if (err) return next(err);
        if (!req.file) return next();
        
        try {
          await processFile(req.file);
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

// Multiple file upload middleware
export const uploadMultiple = (fieldName, maxCount, useLocalStorage = false) => {
  if (useLocalStorage) {
    return (req, res, next) => {
      localUpload.array(fieldName, maxCount)(req, res, async (err) => {
        if (err) return next(err);
        if (!req.files || req.files.length === 0) return next();
        
        try {
          for (const file of req.files) {
            await processFile(file);
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