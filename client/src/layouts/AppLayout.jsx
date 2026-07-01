import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ChevronLeft, LayoutDashboard, LogOut, Menu, Moon, Search, Settings, Sun, UserRound, X, Keyboard, TrendingUp } from 'lucide-react';
import { Brand } from '../components/Brand.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const studentLinks = [
  ['/dashboard', LayoutDashboard, 'Dashboard'],
  ['/dashboard#exams', Keyboard, 'Typing Tests'],
  ['/results', BarChart3, 'Results'],
  ['/analytics', TrendingUp, 'Analytics'],
  ['/profile', UserRound, 'Profile'],
  ['/student-settings', Settings, 'Settings']
];

export function AppLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [menuOpen, setMenuOpen] = useState(false); const [collapsed, setCollapsed] = useState(false); const [dark, setDark] = useState(() => localStorage.getItem('typepath_theme') === 'dark');
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('typepath_theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { const syncTheme = (event) => setDark(event.detail === 'dark'); window.addEventListener('typepath:theme', syncTheme); return () => window.removeEventListener('typepath:theme', syncTheme); }, []);
  const leave = () => { logout(); navigate('/'); };

  if (user.role === 'admin') return <div className="app-shell"><header className="topbar"><Link to="/admin"><Brand /></Link><nav><NavLink to="/admin">Admin</NavLink><NavLink to="/profile"><UserRound size={17} /> Profile</NavLink><button className="nav-button" onClick={leave}><LogOut size={17} /> Logout</button></nav></header><main className="page-container"><Outlet /></main></div>;

  return <div className={`student-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
    <aside className={`student-sidebar ${menuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><Link to="/dashboard"><Brand /></Link><button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav className="student-nav" aria-label="Student navigation">{studentLinks.map(([to, Icon, label]) => <NavLink key={label} to={to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `${isActive && !to.includes('#') ? 'active' : ''}`} title={collapsed ? label : undefined}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-support"><span>Need a warm-up?</span><p>Start slowly. Accuracy builds speed.</p><Link to="/dashboard#exams">Browse tests</Link></div>
      <button className="sidebar-logout" onClick={leave}><LogOut size={19} /><span>Logout</span></button>
      <button className="collapse-button" onClick={() => setCollapsed((value) => !value)} aria-label="Collapse sidebar"><ChevronLeft /></button>
    </aside>
    {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close menu" />}
    <div className="student-workspace">
      <header className="student-topbar"><button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu /></button>{location.pathname === '/dashboard' && <label className="dashboard-search"><Search size={18} /><input aria-label="Search exams" placeholder="Search exams…" /></label>}<div className="student-top-actions"><button onClick={() => setDark((value) => !value)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`}>{dark ? <Sun /> : <Moon />}</button><div className="student-user"><span className="user-avatar">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>SSC Aspirant</small></div></div></div></header>
      <main className="student-main"><Outlet /></main>
    </div>
  </div>;
}
