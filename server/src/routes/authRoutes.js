import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema, forgotSchema, resetSchema, profileSchema, changePasswordSchema } from '../validators/schemas.js';

export const authRouter = Router();
authRouter.post('/register', validate(registerSchema), auth.register);
authRouter.post('/login', validate(loginSchema), auth.login);
authRouter.post('/forgot-password', validate(forgotSchema), auth.forgotPassword);
authRouter.post('/reset-password', validate(resetSchema), auth.resetPassword);
authRouter.get('/me', authenticate, auth.me);
authRouter.patch('/profile', authenticate, validate(profileSchema), auth.updateProfile);
authRouter.patch('/change-password', authenticate, validate(changePasswordSchema), auth.changePassword);
