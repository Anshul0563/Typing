import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  siteName: { type: String, default: 'SAS Academy', trim: true, maxlength: 60 },
  supportEmail: { type: String, default: '', trim: true },
  announcement: { type: String, default: '', trim: true, maxlength: 240 },
  maintenanceMode: { type: Boolean, default: false }
}, { timestamps: true });

export const Setting = mongoose.model('Setting', settingSchema);
