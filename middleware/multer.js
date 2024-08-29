import multer from 'multer';
import sharpMulter from 'sharp-multer';
// Configure storage for Multer
const storage = sharpMulter({
  imageOptions: {
    fileFormat: "webp",
    quality: 50,
    useTimestamp: true
    // resize: { width: 500, height: 500, resizeMode: "contain" },
  },
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // Save files in the public/uploads directory
  },
  filename: (og_filename, options) => {
    const newname =
      og_filename.split(".").slice(0, -1).join(".") +
      `${options.useTimestamp ? "-" + Date.now() : ""}` +
      "." +
      options.fileFormat;
    return newname;
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
  limits: { fileSize: 30 * 1024 * 1024 }, // Limit file size to 30MB
  fileFilter: fileFilter
});

// Export the middleware for single file uploads
export const uploadSingle = (fieldName) => upload.single(fieldName);