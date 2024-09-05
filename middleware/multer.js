import { S3Client } from '@aws-sdk/client-s3';
import multer from 'multer';
import multerS3 from 'multer-s3';
import sharp from 'sharp';
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
const storage = multerS3({
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

// Multer middleware for file upload
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      cb(null, `${Date.now().toString()}-${file.originalname.split('.')[0]}.webp`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE,
    shouldTransform: true, // Enable transformation
    transforms: [
      {
        id: 'resized-webp',
        key: (req, file, cb) => {
          cb(null, `${Date.now().toString()}-${file.originalname.split('.')[0]}.webp`);
        },
        transform: function (req, file, cb) {
          // Use sharp to resize and convert to webp
          cb(null, sharp().resize(800).webp({ quality: 50 }));
        }
      }
    ]
  }),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB file size limit
  fileFilter: (req, file, cb) => {
    const fileTypes = ['jpeg', 'jpg', 'png', 'gif'];
    const extname = file.originalname.split('.').pop().toLowerCase();
    const mimeType = file.mimetype.split('/').pop().toLowerCase();

    if (fileTypes.includes(extname) && fileTypes.includes(mimeType)) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only images are allowed (jpeg, jpg, png, gif)!'));
    }
  }
});

// Single file upload middleware
export const uploadSingle = (fieldName) => upload.single(fieldName);

// Multiple file upload middleware
export const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);

