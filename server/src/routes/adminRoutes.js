import { Router } from 'express';
import { stats, users, toggleUser } from '../controllers/adminController.js';
import { Setting } from '../models/Setting.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '../validators/schemas.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'));
adminRouter.get('/stats', stats);
adminRouter.get('/users', users);
adminRouter.patch('/users/:id/toggle', toggleUser);
adminRouter.get('/settings', asyncHandler(async (_req, res) => {
  const settings = await Setting.findOne() || await Setting.create({});
  res.json({ success: true, settings });
}));
adminRouter.put('/settings', validate(settingsSchema), asyncHandler(async (req, res) => {
  const allowed = (({ siteName, supportEmail, announcement, maintenanceMode }) => ({ siteName, supportEmail, announcement, maintenanceMode }))(req.body);
  const settings = await Setting.findOneAndUpdate({}, allowed, { new: true, upsert: true, runValidators: true });
  res.json({ success: true, settings });
}));
