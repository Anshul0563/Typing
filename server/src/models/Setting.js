import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'SAS Academy', trim: true, maxlength: 60 },
  supportEmail: { type: String, default: '', trim: true },
  contactPhone: { type: String, default: '', trim: true, maxlength: 20 },
  addressUrl: { type: String, default: '', trim: true, maxlength: 300 },
  instagramUrl: { type: String, default: '', trim: true, maxlength: 300 },
  whatsappUrl: { type: String, default: '', trim: true, maxlength: 300 },
  youtubeUrl: { type: String, default: '', trim: true, maxlength: 300 },
  announcement: { type: String, default: '', trim: true, maxlength: 240 },
  maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

export const Setting = mongoose.model('Setting', settingSchema);
