import { User } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { Paragraph } from '../models/Paragraph.js';
import { Result } from '../models/Result.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const stats = asyncHandler(async (_req, res) => {
  const [users, exams, paragraphs, tests] = await Promise.all([User.countDocuments({ role: 'user' }), Exam.countDocuments(), Paragraph.countDocuments(), Result.countDocuments()]);
  res.json({ success: true, stats: { users, exams, paragraphs, tests } });
});
export const users = asyncHandler(async (req, res) => {
  const search = req.query.search?.trim();
  const escapedSearch = search?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = { role: 'user', ...(escapedSearch && { $or: [{ name: new RegExp(escapedSearch, 'i') }, { email: new RegExp(escapedSearch, 'i') }] }) };
  res.json({ success: true, users: await User.find(filter).sort({ createdAt: -1 }).limit(500) });
});
export const toggleUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) throw new AppError('User not found', 404);
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, user });
});
