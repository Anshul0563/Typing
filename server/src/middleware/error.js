import mongoose from 'mongoose';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  if (error instanceof mongoose.Error.CastError) { status = 400; message = 'Invalid resource identifier'; }
  if (error.code === 11000) { status = 409; message = 'A record with this value already exists'; }
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message, ...(error.details && { errors: error.details }) });
}
