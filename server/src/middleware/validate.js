import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    return next(new AppError('Validation failed', 400, result.error.flatten().fieldErrors));
  }
  if (result.data.body) req.body = result.data.body;
  if (result.data.query) req.validatedQuery = result.data.query;
  next();
};
