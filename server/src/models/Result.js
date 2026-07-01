import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  testSessionId: { type: String, unique: true, sparse: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  paragraph: { type: mongoose.Schema.Types.ObjectId, ref: 'Paragraph', required: true },
  testMode: { type: String, enum: ['TCS', 'NTA', 'Standard'], default: 'TCS' },
  typedText: { type: String, default: '' },
  grossWpm: Number, netWpm: Number, accuracy: Number,
  correctCharacters: Number, wrongCharacters: Number,
  omittedCharacters: Number, extraCharacters: Number,
  totalErrors: Number, referenceCharacters: Number,
  typedCharacters: Number, typedWords: Number,
  referenceWords: Number, wrongWords: Number, omittedWords: Number, extraWords: Number,
  errorUnits: Number, scoringMode: String, errorPenalty: Number,
  totalKeystrokes: Number, backspaceCount: Number,
  timeTaken: Number,
  dayOfWeek: Number,
  hourOfDay: Number
}, { timestamps: true });

resultSchema.pre('save', function (next) {
  if (!this.dayOfWeek) this.dayOfWeek = new Date(this.createdAt).getDay();
  if (!this.hourOfDay) this.hourOfDay = new Date(this.createdAt).getHours();
  next();
});

export const Result = mongoose.model('Result', resultSchema);
