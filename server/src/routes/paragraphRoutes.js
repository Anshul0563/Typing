import { Router } from 'express';
import * as paragraphs from '../controllers/paragraphController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paragraphSchema, paragraphListSchema, idSchema } from '../validators/schemas.js';

export const paragraphRouter = Router();
paragraphRouter.use(authenticate, authorize('admin'));
paragraphRouter.get('/', validate(paragraphListSchema), paragraphs.listParagraphs);
paragraphRouter.post('/', validate(paragraphSchema), paragraphs.createParagraph);
paragraphRouter.put('/:id', validate(idSchema), validate(paragraphSchema), paragraphs.updateParagraph);
paragraphRouter.delete('/:id', validate(idSchema), paragraphs.deleteParagraph);
