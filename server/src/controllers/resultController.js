import { Result } from '../models/Result.js';
import { Paragraph } from '../models/Paragraph.js';
import { Exam } from '../models/Exam.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { calculateResult, classifyErrors } from '../utils/scoring.js';
import { verifyTestToken } from '../utils/jwt.js';
import { calculateElapsedSeconds } from '../utils/testTiming.js';
import { resolveEvaluationMode } from '../utils/examMode.js';

const modeScoringRules = {
  TCS: { mode: 'character', errorPenalty: 1 },
  // Mode labels describe the interface; classified full/half errors remain the scoring source of truth.
  NTA: { mode: 'standard-word', errorPenalty: 1 },
  Custom: { mode: 'standard-word', errorPenalty: 1 }
};

const scoringRuleForMode = (exam, testMode) => ({
  ...(modeScoringRules[testMode] || exam.scoringRule),
  errorPenalty: exam.scoringRule?.errorPenalty ?? modeScoringRules[testMode]?.errorPenalty ?? 1
});

const withSynchronizedComparison = (result) => {
  const value = typeof result?.toObject === 'function' ? result.toObject() : result;
  if (!value?.paragraph?.content || value.comparison?.referenceReviewParts) return value;
  const review = classifyErrors(value.paragraph.content, value.typedText || '', value.evaluationMode === 'ssc-stenographer');
  return { ...value, comparison: { ...(value.comparison || {}), referenceReviewParts: review.referenceReviewParts, typedReviewParts: review.typedReviewParts } };
};

export const submitResult = asyncHandler(async (req, res) => {
  const paragraph = await Paragraph.findById(req.body.paragraphId);
  if (!paragraph) throw new AppError('Paragraph not found', 404);
  const exam = await Exam.findById(paragraph.exam);
  if (!exam) throw new AppError('Exam not found', 404);
  let session;
  try { session = verifyTestToken(req.body.testToken); } catch { throw new AppError('Test session is invalid or expired', 400); }
  if (session.type !== 'typing-test' || session.sub !== req.user._id.toString() || session.paragraphId !== paragraph._id.toString() || session.examId !== exam._id.toString() || session.testMode !== req.body.testMode) throw new AppError('Test session does not match this submission', 400);
  const existingResult = await Result.findOne({ testSessionId: session.jti }).populate('exam', 'name language').populate('paragraph', 'title content');
  if (existingResult) return res.json({ success: true, result: withSynchronizedComparison(existingResult) });
  const elapsedSeconds = calculateElapsedSeconds(session.startedAt, Date.now(), (session.endsAt - session.startedAt) / 1000);
  const typedLength = Array.from(req.body.typedText.normalize('NFC')).length;
  const referenceLength = Array.from(paragraph.content.normalize('NFC')).length;
  if (referenceLength > 5000) throw new AppError('This paragraph is too large to evaluate safely. Ask an administrator to shorten it.', 422);
  if (typedLength > referenceLength + 1000) throw new AppError('Typed text exceeds the permitted test length', 400);
  const metrics = calculateResult(paragraph.content, req.body.typedText, elapsedSeconds, req.body, { ...scoringRuleForMode(exam, req.body.testMode), evaluationMode: resolveEvaluationMode(exam) });
  let result;
  try { result = await Result.create({ testSessionId: session.jti, user: req.user._id, exam: exam._id, paragraph: paragraph._id, typedText: req.body.typedText, testMode: req.body.testMode, ...metrics }); }
  catch (error) {
    if (error?.code !== 11000) throw error;
    result = await Result.findOne({ testSessionId: session.jti });
    if (!result) throw error;
  }
  res.status(201).json({ success: true, result: { ...result.toObject(), exam: { _id: exam._id, name: exam.name }, paragraph: { _id: paragraph._id, title: paragraph.title, content: paragraph.content } } });
});
export const getResult = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.user = req.user._id;
  const result = await Result.findOne(filter).populate('exam', 'name language').populate('paragraph', 'title content');
  if (!result) throw new AppError('Result not found', 404);
  res.json({ success: true, result: withSynchronizedComparison(result) });
});

export const deleteResult = asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'admin') filter.user = req.user._id;
  const result = await Result.findOneAndDelete(filter);
  if (!result) throw new AppError('Result not found', 404);
  res.status(204).send();
});

export const listMyResults = asyncHandler(async (req, res) => {
  const [results, aggregates] = await Promise.all([
    Result.find({ user: req.user._id }).select('-typedText').populate('exam', 'name language').populate('paragraph', 'title').sort({ createdAt: -1 }).limit(100),
    Result.aggregate([{ $match: { user: req.user._id } }, { $group: { _id: null, totalTests: { $sum: 1 }, bestWpm: { $max: '$netWpm' }, averageAccuracy: { $avg: '$accuracy' } } }])
  ]);
  const aggregate = aggregates[0] || { totalTests: 0, bestWpm: 0, averageAccuracy: 0 };
  const totalTests = aggregate.totalTests;
  const bestWpm = Math.round((aggregate.bestWpm || 0) * 100) / 100;
  const averageAccuracy = Math.round((aggregate.averageAccuracy || 0) * 100) / 100;
  res.json({ success: true, results, summary: { totalTests, bestWpm, averageAccuracy } });
});
