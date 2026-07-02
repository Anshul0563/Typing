import { Paragraph } from '../models/Paragraph.js';

export const starterPassages = {
  English: 'Public service requires patience, accuracy and a strong sense of responsibility. A candidate preparing for a competitive examination should practise with discipline every day. Regular typing sessions improve rhythm and reduce avoidable mistakes. Focus first on accuracy, maintain a comfortable posture and let speed develop naturally through consistent effort.',
  Hindi: 'भारत एक विशाल और विविधताओं से भरा देश है। यहाँ अनेक भाषाएँ, संस्कृतियाँ और परंपराएँ एक साथ विकसित हुई हैं। नियमित अभ्यास से टाइपिंग की गति और शुद्धता दोनों में सुधार आता है। अभ्यर्थियों को परीक्षा के समान वातावरण में शांत मन से अभ्यास करना चाहिए।'
};

export const starterParagraphFor = (exam) => ({
  title: `${exam.name} Sample`,
  content: starterPassages[exam.language] || starterPassages.English,
  language: exam.language,
  exam: exam._id,
  difficulty: 'Medium'
});

export async function ensureExamParagraph(exam) {
  const exists = await Paragraph.exists({ exam: exam._id, language: exam.language });
  return exists ? null : Paragraph.create(starterParagraphFor(exam));
}
