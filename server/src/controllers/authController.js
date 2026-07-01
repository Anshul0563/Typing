import crypto from 'crypto';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const authResponse = (res, user, status = 200) => res.status(status).json({ success: true, token: signToken(user), user });

export const register = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw new AppError('Email is already registered', 409);
  const user = await User.create(req.body);
  authResponse(res, user, 201);
});
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !user.isActive || !(await user.comparePassword(req.body.password))) throw new AppError('Invalid email or password', 401);
  authResponse(res, user);
});
export const me = asyncHandler(async (req, res) => res.json({ success: true, user: req.user }));
export const updateProfile = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  res.json({ success: true, user: req.user });
});
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new AppError('Current password is incorrect', 400);
  user.password = req.body.newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+resetPasswordToken +resetPasswordExpires');
  let resetToken;
  if (user) {
    resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    await sendPasswordResetEmail(user, resetToken);
  }
  res.json({ success: true, message: 'If the account exists, reset instructions are ready.', ...(process.env.NODE_ENV !== 'production' && resetToken ? { resetToken } : {}) });
});
export const resetPassword = asyncHandler(async (req, res) => {
  const digest = crypto.createHash('sha256').update(req.body.token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: digest, resetPasswordExpires: { $gt: Date.now() } }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new AppError('Reset link is invalid or expired', 400);
  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  authResponse(res, user);
});
