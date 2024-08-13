class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.isOperational = true; // Mark this as an operational error (expected)
    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  console.error("Error Stack:", err.stack);

  if (!err.isOperational) {
    console.error("Unexpected Error:", err);
    statusCode = 500;
    message = "Something went wrong!";
  } else {
    console.error("Operational Error:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "development" ? err.stack : { message },
  });
};

// Utility function to create and throw custom application errors
export const createAppError = (message, statusCode) => {
  return new AppError(message, statusCode);
};
