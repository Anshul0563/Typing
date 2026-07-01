import '../src/config/env.js';
import { connectDatabase } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Exam } from '../src/models/Exam.js';
import { Paragraph } from '../src/models/Paragraph.js';
import { Result } from '../src/models/Result.js';
import { defaultExams } from '../src/data/defaultExams.js';

await connectDatabase();
await Paragraph.syncIndexes();

const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
if (!(await User.exists({ email: adminEmail }))) {
  await User.create({ name: 'Administrator', email: adminEmail, password: process.env.ADMIN_PASSWORD || 'ChangeMe123!', role: 'admin' });
}

const catalogueNames = defaultExams.map(({ name }) => name);
const obsoleteExams = await Exam.find({ name: { $nin: catalogueNames } }).select('_id');
const obsoleteIds = obsoleteExams.map(({ _id }) => _id);
if (obsoleteIds.length) {
  await Promise.all([
    Result.deleteMany({ exam: { $in: obsoleteIds } }),
    Paragraph.deleteMany({ exam: { $in: obsoleteIds } })
  ]);
  await Exam.deleteMany({ _id: { $in: obsoleteIds } });
}

const englishContent = 'Public service requires patience, accuracy and a strong sense of responsibility. A candidate preparing for a competitive examination should practise with discipline every day. Regular typing sessions improve rhythm and reduce avoidable mistakes. Focus first on accuracy, maintain a comfortable posture and let speed develop naturally through consistent effort.';
const hindiContent = 'भारत एक विशाल और विविधताओं से भरा देश है। यहाँ अनेक भाषाएँ, संस्कृतियाँ और परंपराएँ एक साथ विकसित हुई हैं। नियमित अभ्यास से टाइपिंग की गति और शुद्धता दोनों में सुधार आता है। अभ्यर्थियों को परीक्षा के समान वातावरण में शांत मन से अभ्यास करना चाहिए।';

for (const definition of defaultExams) {
  const existing = await Exam.findOne({ name: definition.name });
  const exam = existing
    ? await Exam.findByIdAndUpdate(existing._id, definition, { new: true, runValidators: true })
    : await Exam.create(definition);
  if (!(await Paragraph.exists({ exam: exam._id }))) {
    await Paragraph.create({ title: `${definition.name} Sample`, content: definition.language === 'Hindi' ? hindiContent : englishContent, language: definition.language, exam: exam._id, difficulty: 'Medium' });
  }
}

console.log(`Seed complete: ${defaultExams.length} catalogue exams. Admin: ${adminEmail}`);
process.exit(0);
