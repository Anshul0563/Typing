import { ArrowUpRight, Clock3, Languages } from 'lucide-react';
import { Button } from '../Button.jsx';

export function ExamCard({ exam, onStart }) {
  return <article className="student-exam-card"><div className="student-exam-card-head"><img className="exam-logo" src={exam.logo} alt={`${exam.organization} icon`} /><span className="available-label"><i />Available</span></div><span className="exam-category">{exam.category || 'Practice'}</span><h3>{exam.name}</h3><small className="exam-organization">{exam.organization}</small><p>{exam.description || 'Focused typing practice in a realistic examination format.'}</p><div className="student-exam-meta"><span><Languages size={15} />{exam.language}</span><span><Clock3 size={15} />{exam.durationMinutes} min</span></div><Button onClick={onStart}>Start test <ArrowUpRight size={17} /></Button></article>;
}
