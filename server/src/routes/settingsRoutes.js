import { Router } from 'express';
import { Setting } from '../models/Setting.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const settingsRouter = Router();

settingsRouter.get('/', asyncHandler(async (_req, res) => {
  const settings = await Setting.findOne() || await Setting.create({});
  res.json({
    success: true,
    settings: {
      siteName: settings.siteName,
      supportEmail: settings.supportEmail,
      contactPhone: settings.contactPhone,
      addressUrl: settings.addressUrl,
      instagramUrl: settings.instagramUrl,
      whatsappUrl: settings.whatsappUrl,
      youtubeUrl: settings.youtubeUrl,
      announcement: settings.announcement,
      maintenanceMode: settings.maintenanceMode
    }
  });
}));
