import multer from 'multer';

// Configure storage for Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Save files in the public/uploads directory
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '.' + file.originalname.split('.').pop(); // Generate a unique file name
    cb(null, uniqueName);
  }
});

// File filter to validate image files
const fileFilter = (req, file, cb) => {
  const fileTypes = ['jpeg', 'jpg', 'png', 'gif'];
  const extname = file.originalname.split('.').pop().toLowerCase();
  const mimeType = file.mimetype.split('/').pop().toLowerCase();

  if (fileTypes.includes(extname) && fileTypes.includes(mimeType)) {
    return cb(null, true);
  } else {
    cb(new Error('Error: Only images are allowed (jpeg, jpg, png, gif)!'));
  }
};

// Initialize the upload middleware with file size limit and validation
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: fileFilter
});

// Export the middleware for single file uploads
export const uploadSingle = (fieldName) => upload.single(fieldName);
