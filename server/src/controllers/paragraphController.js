import { Paragraph } from '../models/Paragraph.js';
import { Exam } from '../models/Exam.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signTestToken } from '../utils/jwt.js';
import { Result } from '../models/Result.js';
import { resolveDurationSeconds, resolveExamMode } from '../utils/examMode.js';

const sampleParagraph = async (exam) => {
  const [paragraph] = await Paragraph.aggregate([{ $match: { exam: exam._id, language: exam.language } }, { $sample: { size: 1 } }, { $project: { title: 1, content: 1, language: 1, difficulty: 1 } }]);
  if (!paragraph) throw new AppError('No paragraph is available for this exam', 404);
  return paragraph;
};

const createTestSession = (user, exam, paragraph, requestedMode, requestedMinutes) => {
  const testMode = resolveExamMode(exam, requestedMode);
  const startedAt = Date.now();
  const durationSeconds = resolveDurationSeconds(exam, requestedMinutes);
  const endsAt = startedAt + durationSeconds * 1000;
  const testToken = signTestToken({ userId: user._id, examId: exam._id, paragraphId: paragraph._id, testMode, startedAt, endsAt, durationSeconds });
  return { testToken, testMode, startedAt, endsAt, durationSeconds };
};

export const listParagraphs = asyncHandler(async (req, res) => {
  const { search, exam, language } = req.validatedQuery || {};
  const filter = {};
  if (exam) filter.exam = exam;
  if (language) filter.language = language;
  if (search) filter.$text = { $search: search };
  const paragraphs = await Paragraph.find(filter).populate('exam', 'name').sort({ createdAt: -1 }).limit(500);
  res.json({ success: true, paragraphs });
});
export const createParagraph = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.body.exam);
  if (!exam) throw new AppError('Exam not found', 404);
  if (req.body.language !== exam.language) throw new AppError(`Paragraph language must match the exam language (${exam.language})`, 400);
  const paragraph = await Paragraph.create(req.body);
  res.status(201).json({ success: true, paragraph: await paragraph.populate('exam', 'name') });
});
export const updateParagraph = asyncHandler(async (req, res) => {
  const exam = await Exam.findById(req.body.exam);
  if (!exam) throw new AppError('Exam not found', 404);
  if (req.body.language !== exam.language) throw new AppError(`Paragraph language must match the exam language (${exam.language})`, 400);
  const paragraph = await Paragraph.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('exam', 'name');
  if (!paragraph) throw new AppError('Paragraph not found', 404);
  res.json({ success: true, paragraph });
});
export const deleteParagraph = asyncHandler(async (req, res) => {
  const paragraph = await Paragraph.findById(req.params.id);
  if (!paragraph) throw new AppError('Paragraph not found', 404);
  const resultCount = await Result.countDocuments({ paragraph: paragraph._id });
  if (resultCount) throw new AppError(`This paragraph has ${resultCount} saved result${resultCount === 1 ? '' : 's'} and cannot be deleted.`, 409);
  await paragraph.deleteOne();
  res.status(204).send();
});
export const randomParagraph = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, status: 'active' });
  if (!exam) throw new AppError('Exam is unavailable', 404);
  const paragraph = await sampleParagraph(exam);
  res.json({ success: true, exam, paragraph });
});

export const listExamParagraphs = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, status: 'active' }).select('name organization language category durationMinutes logo description').lean();
  if (!exam) throw new AppError('Exam is unavailable', 404);
  const paragraphs = await Paragraph.aggregate([
    { $match: { exam: exam._id, language: exam.language } },
    { $addFields: { difficultyOrder: { $switch: { branches: [
      { case: { $eq: ['$difficulty', 'Easy'] }, then: 1 },
      { case: { $eq: ['$difficulty', 'Medium'] }, then: 2 },
      { case: { $eq: ['$difficulty', 'Hard'] }, then: 3 }
    ], default: 4 } } } },
    { $sort: { difficultyOrder: 1, createdAt: -1, title: 1 } },
    { $project: { title: 1, language: 1, difficulty: 1, wordCount: { $size: { $regexFindAll: { input: '$content', regex: /\S+/ } } } } }
  ]);
  res.json({ success: true, exam, paragraphs });
});

export const launchTest = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, status: 'active' }).lean();
  if (!exam) throw new AppError('Exam is unavailable', 404);
  const paragraph = await Paragraph.findOne({ _id: req.body.paragraphId, exam: exam._id, language: exam.language }).select('title content language difficulty').lean();
  if (!paragraph) throw new AppError('Paragraph is unavailable for this exam', 404);
  if (exam.category === 'Practice') return res.json({ success: true, requiresSettings: true, exam, paragraph });
  const session = createTestSession(req.user, exam, paragraph);
  res.status(201).json({ success: true, requiresSettings: false, exam, paragraph, ...session });
});

export const startTest = asyncHandler(async (req, res) => {
  const exam = await Exam.findOne({ _id: req.params.id, status: 'active' });
  if (!exam) throw new AppError('Exam is unavailable', 404);
  const paragraph = await Paragraph.findOne({ _id: req.body.paragraphId, exam: exam._id });
  if (!paragraph) throw new AppError('Paragraph is unavailable for this exam', 404);
  const session = createTestSession(req.user, exam, paragraph, req.body.requestedMode, req.body.timerMinutes);
  res.status(201).json({ success: true, ...session });
});
