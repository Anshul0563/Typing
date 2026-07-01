import { useEffect, useState } from 'react';
import { Search, ShieldCheck, UserRound, Users } from 'lucide-react';
import { api } from '../../services/api.js';
import { Button } from '../../components/Button.jsx';
import { Notice } from '../../components/Toast.jsx';
import { Loader } from '../../components/Loader.jsx';

export default function ManageUsers() {
  const [users, setUsers] = useState([]); const [search, setSearch] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [updating, setUpdating] = useState('');
  const load = () => { setLoading(true); api(`/admin/users?search=${encodeURIComponent(search)}`).then((data) => { setUsers(data.users); setError(''); }).catch((e) => setError(e.message)).finally(() => setLoading(false)); };
  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [search]);
  const toggle = async (id) => { setUpdating(id); try { await api(`/admin/users/${id}/toggle`, { method: 'PATCH' }); await load(); } catch (e) { setError(e.message); } finally { setUpdating(''); } };
  return <><div className="admin-page-heading"><div><span>Learners</span><h1>Manage users</h1><p>Search accounts and control access securely.</p></div><div className="admin-heading-badge"><Users />{users.length} shown</div></div><Notice>{error}</Notice><div className="admin-toolbar"><label className="admin-search"><Search /><input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>{loading ? <Loader label="Loading users…" /> : users.length ? <div className="admin-user-grid">{users.map((user) => <article key={user._id}><div className="admin-user-avatar">{user.name.slice(0, 1).toUpperCase()}</div><div className="admin-user-info"><strong>{user.name}</strong><span>{user.email}</span><small>Joined {new Date(user.createdAt).toLocaleDateString()}</small></div><div className="admin-user-control"><span className={`badge badge-${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Blocked'}</span><Button variant="secondary" disabled={updating === user._id} onClick={() => toggle(user._id)}>{user.isActive ? <><UserRound />Block</> : <><ShieldCheck />Restore</>}</Button></div></article>)}</div> : <div className="admin-empty"><Users /><h2>No users found</h2><p>Try a different name or email address.</p></div>}</>;
}
