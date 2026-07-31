export const errorHandler = (err, req, res, next) => {
  // Log the detailed error internally
  console.error('[Global Error]', err);

  // Default error details
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = 'Internal Server Error';
  let errors = [];

  // Handle Prisma Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    statusCode = 400; // Bad request for most DB constraint errors
    if (err.code === 'P2002') {
      message = 'Duplicate field value entered';
      errors.push({ field: err.meta?.target || 'unknown', message: 'Must be unique' });
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Resource not found';
    } else {
      message = 'Database constraint violation';
    }
  } 
  // Handle other expected errors (e.g., from our own code throw new Error(...))
  else if (err.message && statusCode !== 500) {
    message = err.message;
  }
  // If it's a 500 error, mask the message in production to prevent leaking internals
  else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected internal error occurred';
  } else if (err.message) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    data: null,
    timestamp: new Date().toISOString()
  });
};

export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
