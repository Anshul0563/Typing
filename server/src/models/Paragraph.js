import mongoose from 'mongoose';

const paragraphSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  language: { type: String, enum: ['English', 'Hindi'], required: true, index: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium', index: true }
}, { timestamps: true });

paragraphSchema.index({ exam: 1, language: 1 });

paragraphSchema.index(
  { title: 'text', content: 'text' },
  { default_language: 'none', language_override: 'searchLanguage' }
);
export const Paragraph = mongoose.model('Paragraph', paragraphSchema);
