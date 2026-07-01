import { Router } from 'express';
import { submitResult, getResult, listMyResults } from '../controllers/resultController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { submitSchema, idSchema } from '../validators/schemas.js';

export const resultRouter = Router();
resultRouter.use(authenticate);
resultRouter.post('/', validate(submitSchema), submitResult);
resultRouter.get('/', listMyResults);
resultRouter.get('/:id', validate(idSchema), getResult);
