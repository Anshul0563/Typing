import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Keyboard, Search } from 'lucide-react';
import { api } from '../services/api.js';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';
import { ExamCard } from '../components/dashboard/ExamCard.jsx';

export default function Exams() {
  const navigate = useNavigate(); const location = useLocation(); const [exams, setExams] = useState([]); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const query = new URLSearchParams(location.search).get('q')?.trim().toLowerCase() || '';
  const updateSearch = (value) => navigate({ pathname: '/exams', search: value.trim() ? `?q=${encodeURIComponent(value)}` : '' }, { replace: true });
  useEffect(() => { api('/exams').then((data) => setExams(data.exams)).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  const filtered = useMemo(() => query ? exams.filter((exam) => [exam.name, exam.organization, exam.category, exam.language, exam.description].some((value) => String(value || '').toLowerCase().includes(query))) : exams, [exams, query]);
  if (loading) return <Loader label="Loading typing tests…" />;
  return <><div className="student-page-title exams-page-title"><div><span>Test catalogue</span><h1>Choose your typing test</h1><p>Browse every active exam and select the passage you want to practise.</p></div><span className="exam-count">{query ? `${filtered.length} found` : `${exams.length} active`}</span></div><label className="catalogue-mobile-search"><Search /><input aria-label="Search typing tests" placeholder="Search exams…" value={new URLSearchParams(location.search).get('q') || ''} onChange={(event) => updateSearch(event.target.value)} /></label><Notice>{error}</Notice>{filtered.length ? <div className="student-exam-grid exams-catalogue-grid">{filtered.map((exam) => <ExamCard key={exam._id} exam={exam} onStart={() => navigate(`/test/${exam._id}`)} />)}</div> : <section className="results-empty compact-empty"><Keyboard /><h2>{exams.length ? 'No matching exams' : 'No active exams'}</h2><p>{exams.length ? 'Try another exam name, organization, category or language.' : 'Your administrator is preparing new tests. Please check again shortly.'}</p></section>}</>;
}
