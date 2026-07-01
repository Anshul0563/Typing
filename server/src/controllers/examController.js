import { Exam } from '../models/Exam.js';
import { Paragraph } from '../models/Paragraph.js';
import { Result } from '../models/Result.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listExams = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { status: 'active' };
  const exams = await Exam.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, exams });
});
export const createExam = asyncHandler(async (req, res) => res.status(201).json({ success: true, exam: await Exam.create(req.body) }));
export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!exam) throw new AppError('Exam not found', 404);
  res.json({ success: true, exam });
});
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);
  await Promise.all([Paragraph.deleteMany({ exam: exam._id }), Result.deleteMany({ exam: exam._id })]);
  await exam.deleteOne();
  res.status(204).send();
});
