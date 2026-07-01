import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  if (error instanceof mongoose.Error.CastError) { status = 400; message = 'Invalid resource identifier'; }
  if (error.code === 11000) { status = 409; message = 'A record with this value already exists'; }
  if (error.message === 'Not allowed by CORS') {
    status = 403;
    message = 'Origin is not allowed';
  }
  if (status >= 500) console.error(error);
  const isProduction = process.env.NODE_ENV === 'production';
  const safeMessage = status >= 500 && isProduction ? 'Internal server error' : message;
  const includeDetails = error.details && (!isProduction || status < 500);
  res.status(status).json({
    success: false,
    message: safeMessage,
    ...(includeDetails && { errors: error.details }),
    ...(!isProduction && status >= 500 && { path: req.originalUrl })
  });
}
