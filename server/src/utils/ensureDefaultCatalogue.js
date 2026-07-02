import { defaultExams } from '../data/defaultExams.js';
import { Exam } from '../models/Exam.js';
import { Paragraph } from '../models/Paragraph.js';
import { starterParagraphFor } from './ensureExamParagraph.js';

export async function ensureDefaultCatalogue({ logger = console } = {}) {
  const catalogueWrite = await Exam.bulkWrite(defaultExams.map((exam) => ({ updateOne: { filter: { name: exam.name }, update: { $setOnInsert: exam }, upsert: true } })), { ordered: false });

  // Cover admin-created and future exams too, not only the built-in catalogue.
  const exams = await Exam.find({}).select('_id name language').lean();
  const existingParagraphs = await Paragraph.find({ exam: { $in: exams.map((exam) => exam._id) } }).select('exam language').lean();
  const coveredExams = new Set(existingParagraphs.map((paragraph) => `${paragraph.exam}:${paragraph.language}`));
  const paragraphs = exams.filter((exam) => !coveredExams.has(`${exam._id}:${exam.language}`)).map(starterParagraphFor);
  if (paragraphs.length) await Paragraph.insertMany(paragraphs, { ordered: false });

  const created = catalogueWrite.upsertedCount || 0;
  logger.info?.(`Default catalogue ensured: ${created} exams and ${paragraphs.length} sample paragraphs created.`);
  return { created, updated: 0, paragraphsCreated: paragraphs.length };
}
