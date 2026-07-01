import { useEffect, useState } from 'react';
import { ArrowRight, ClipboardList, FileText, Keyboard, RefreshCw, Settings, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Loader } from '../../components/Loader.jsx';
import { Notice } from '../../components/Toast.jsx';
import { Button } from '../../components/Button.jsx';

export default function AdminOverview() {
  const [stats, setStats] = useState(null); const [error, setError] = useState('');
  const load = () => { setError(''); setStats(null); api('/admin/stats').then((data) => setStats(data.stats)).catch((e) => setError(e.message)); };
  useEffect(load, []);
  const cards = stats ? [['Registered users', stats.users, Users, 'blue'], ['Published exams', stats.exams, ClipboardList, 'violet'], ['Paragraph library', stats.paragraphs, FileText, 'green'], ['Tests completed', stats.tests, Keyboard, 'amber']] : [];
  return <><div className="admin-page-heading"><div><span>Dashboard</span><h1>Good to see you.</h1><p>Manage SAS Academy from one focused workspace.</p></div><Button variant="secondary" onClick={load}><RefreshCw />Refresh data</Button></div>{error && <div className="admin-load-error"><Notice>{error}</Notice><Button onClick={load}>Try again</Button></div>}{!stats && !error && <Loader label="Loading dashboard…" />}{stats && <><div className="admin-overview-stats">{cards.map(([label, value, Icon, tone]) => <article key={label} className={`admin-stat-${tone}`}><span><Icon /></span><div><p>{label}</p><strong>{value.toLocaleString()}</strong></div></article>)}</div><div className="admin-overview-grid"><section className="admin-panel-card"><div className="admin-panel-title"><div><span>Content management</span><h2>Keep practice material ready</h2></div><FileText /></div><p>Create exams with configurable scoring rules, then attach language-matched paragraphs for students.</p><div className="admin-action-list"><Link to="/admin/exams"><span><ClipboardList /><b>Manage exams</b></span><ArrowRight /></Link><Link to="/admin/paragraphs"><span><FileText /><b>Manage paragraphs</b></span><ArrowRight /></Link></div></section><section className="admin-panel-card"><div className="admin-panel-title"><div><span>Platform controls</span><h2>Users and website</h2></div><Settings /></div><p>Control learner access and update public website preferences without changing code.</p><div className="admin-action-list"><Link to="/admin/users"><span><Users /><b>Manage users</b></span><ArrowRight /></Link><Link to="/admin/settings"><span><Settings /><b>Website settings</b></span><ArrowRight /></Link></div></section></div></>}</>;
}
