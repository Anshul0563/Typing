import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  testSessionId: { type: String, unique: true, sparse: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  paragraph: { type: mongoose.Schema.Types.ObjectId, ref: 'Paragraph', required: true },
  testMode: { type: String, enum: ['TCS', 'NTA', 'Custom', 'Standard'], default: 'TCS' },
  typedText: { type: String, default: '' },
  grossWpm: Number, netWpm: Number, accuracy: Number,
  totalErrors: Number, typedWords: Number,
  referenceWords: Number, wrongWords: Number, omittedWords: Number, extraWords: Number,
  totalWordErrors: Number,
  errorUnits: Number, scoringMode: String, errorPenalty: Number,
  evaluationMode: String, fullErrors: Number, halfErrors: Number, weightedErrors: Number,
  errorBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  comparison: { type: mongoose.Schema.Types.Mixed, default: {} },
  totalKeystrokes: Number, backspaceCount: Number,
  timeTaken: Number,
  dayOfWeek: Number,
  hourOfDay: Number
}, { timestamps: true });

resultSchema.pre('save', function (next) {
  const timestamp = this.createdAt || new Date();
  if (this.dayOfWeek == null) this.dayOfWeek = timestamp.getDay();
  if (this.hourOfDay == null) this.hourOfDay = timestamp.getHours();
  next();
});

export const Result = mongoose.model('Result', resultSchema);
