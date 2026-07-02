import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, CalendarDays, Gauge, Keyboard, Target, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { Loader } from '../components/Loader.jsx';
import { Notice } from '../components/Toast.jsx';
import { StatCard } from '../components/dashboard/StatCard.jsx';

export default function ResultsHistory() {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [deletingId, setDeletingId] = useState('');
  const load = () => api('/results').then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const remove = async (result) => {
    if (!window.confirm(`Delete the result for ${result.exam?.name || 'this typing test'}? This cannot be undone.`)) return;
    setDeletingId(result._id); setError('');
    try { await api(`/results/${result._id}`, { method: 'DELETE' }); await load(); }
    catch (e) { setError(e.message); }
    finally { setDeletingId(''); }
  };
  if (!data && !error) return <Loader label="Loading your results…" />;
  const summary = data?.summary || { totalTests: 0, bestWpm: 0, averageAccuracy: 0 };
  return <><div className="student-page-title"><div><span>Performance</span><h1>Your results</h1><p>Review completed tests and learn from every attempt.</p></div><Link className="button button-primary" to="/dashboard#exams"><Keyboard size={17} />Start a test</Link></div><Notice>{error}</Notice><div className="student-stats results-stats"><StatCard icon={BarChart3} label="Tests completed" value={summary.totalTests} /><StatCard icon={Gauge} label="Best net speed" value={`${summary.bestWpm} WPM`} tone="violet" /><StatCard icon={Target} label="Average accuracy" value={`${summary.averageAccuracy}%`} tone="green" /></div>{data?.results.length ? <section className="results-list"><div className="results-list-head"><span>Exam</span><span>Date</span><span>Net speed</span><span>Accuracy</span><span /><span>Action</span></div>{data.results.map((result) => <article key={result._id} className="results-row"><Link to={`/result/${result._id}`} className="results-row-link"><span><i><Keyboard /></i><span><strong>{result.exam?.name || 'Typing test'}</strong><small>{result.exam?.language || 'English'} · {result.paragraph?.title || 'Practice paragraph'}</small></span></span><span><CalendarDays />{new Date(result.createdAt).toLocaleDateString()}</span><b>{result.netWpm} WPM</b><b>{result.accuracy}%</b><ArrowUpRight /></Link><button className="result-delete-button" type="button" onClick={() => remove(result)} disabled={deletingId === result._id} aria-label={`Delete ${result.exam?.name || 'typing test'} result`} title="Delete result"><Trash2 /></button></article>)}</section> : <section className="results-empty"><div className="empty-illustration"><span /><span /><span><Keyboard /></span></div><h2>No results yet—but that changes fast.</h2><p>Take your first test to unlock speed, accuracy and character-level performance insights.</p><Link className="button button-primary" to="/dashboard#exams">Choose your first test</Link></section>}</>;
}
