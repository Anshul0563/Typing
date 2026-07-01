import mongoose from 'mongoose';

const examSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  organization: { type: String, required: true, trim: true, maxlength: 100, index: true },
  language: { type: String, enum: ['English', 'Hindi'], required: true, index: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 120 },
  paragraphLength: { type: Number, required: true, min: 50 },
  category: { type: String, enum: ['SSC', 'DSSSB', 'Delhi Police', 'Railway', 'Central Armed Police Forces', 'Education', 'CSIR', 'AIIMS', 'High Courts', 'State Exams', 'Practice'], required: true, index: true },
  logo: { type: String, required: true, trim: true },
  scoringRule: {
    mode: { type: String, enum: ['standard-word', 'character'], default: 'standard-word' },
    errorPenalty: { type: Number, min: 0.1, max: 10, default: 1 }
  },
  testModes: [
    {
      name: { type: String, enum: ['TCS', 'NTA', 'Custom'], required: true },
      isActive: { type: Boolean, default() { return this.name !== 'NTA'; } },
      instructions: String
    }
  ],
  isDefault: { type: Boolean, default: false, index: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  description: { type: String, trim: true, maxlength: 240, default: '' }
}, { timestamps: true });

export const Exam = mongoose.model('Exam', examSchema);
