import { Router } from 'express';
import * as exams from '../controllers/examController.js';
import { randomParagraph, startTest } from '../controllers/paragraphController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { examSchema, idSchema, startTestSchema } from '../validators/schemas.js';

export const examRouter = Router();
examRouter.use(authenticate);
examRouter.get('/', exams.listExams);
examRouter.get('/:id/random-paragraph', validate(idSchema), randomParagraph);
examRouter.post('/:id/start', validate(startTestSchema), startTest);
examRouter.post('/', authorize('admin'), validate(examSchema), exams.createExam);
examRouter.put('/:id', authorize('admin'), validate(examSchema), exams.updateExam);
examRouter.delete('/:id', authorize('admin'), validate(idSchema), exams.deleteExam);
