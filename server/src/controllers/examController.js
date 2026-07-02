import { Exam } from '../models/Exam.js';
import { Paragraph } from '../models/Paragraph.js';
import { Result } from '../models/Result.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ensureExamParagraph } from '../utils/ensureExamParagraph.js';

export const listExams = asyncHandler(async (req, res) => {
  const filter = req.user?.role === 'admin' ? {} : { status: 'active' };
  const exams = await Exam.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, exams });
});
export const createExam = asyncHandler(async (req, res) => {
  const exam = await Exam.create(req.body);
  await ensureExamParagraph(exam);
  res.status(201).json({ success: true, exam });
});
export const updateExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!exam) throw new AppError('Exam not found', 404);
  await ensureExamParagraph(exam);
  res.json({ success: true, exam });
});
export const deleteExam = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.params.id);
  if (!exam) throw new AppError('Exam not found', 404);
  const resultCount = await Result.countDocuments({ exam: exam._id });
  if (resultCount) throw new AppError(`This exam has ${resultCount} saved result${resultCount === 1 ? '' : 's'}. Disable it instead to preserve student history.`, 409);
  await Paragraph.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  res.status(204).send();
});
