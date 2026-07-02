import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, ExternalLink, FileText, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { Footer } from '../components/Footer.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  ['/admin', LayoutDashboard, 'Overview', 'Platform overview'],
  ['/admin/exams', ClipboardList, 'Exams', 'Tests and scoring'],
  ['/admin/paragraphs', FileText, 'Paragraphs', 'Typing content'],
  ['/admin/users', Users, 'Users', 'Learner access'],
  ['/admin/settings', Settings, 'Settings', 'Website preferences']
];

export function AdminLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [open, setOpen] = useState(false);
  const active = links.find(([path]) => path === location.pathname) || links[0];
  const leave = () => { logout(); navigate('/admin/login', { replace: true }); };
  return <div className="admin-shell"><aside className={`admin-sidebar ${open ? 'is-open' : ''}`}><div className="admin-sidebar-brand"><Link to="/admin" onClick={() => setOpen(false)}><Brand /></Link><button onClick={() => setOpen(false)} aria-label="Close admin menu"><X /></button></div><div className="admin-label">Workspace</div><nav>{links.map(([to, Icon, label, detail]) => <NavLink key={to} to={to} end={to === '/admin'} onClick={() => setOpen(false)}><Icon /><span><strong>{label}</strong><small>{detail}</small></span></NavLink>)}</nav><div className="admin-sidebar-bottom"><Link to="/"><ExternalLink />View public website</Link><button onClick={leave}><LogOut />Sign out</button></div></aside>{open && <button className="admin-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}<section className="admin-workspace"><header className="admin-topbar"><div><button className="admin-menu-button" onClick={() => setOpen(true)} aria-label="Open admin menu"><Menu /></button><span><small>Admin console</small><strong>{active[2]}</strong></span></div><div className="admin-account"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div></div></header><main className={`admin-main ${['/admin/users', '/admin/settings'].includes(location.pathname) ? 'admin-main-full' : ''}`}><Outlet /></main><Footer variant="admin" /></section></div>;
}
