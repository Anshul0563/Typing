import { useNavigate } from 'react-router-dom';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Brand() {
  const { settings } = useSiteSettings();
  const { user } = useAuth();
  const navigate = useNavigate();
  const openDashboard = (event) => {
    if (!user) return;
    event.preventDefault();
    navigate(user.role === 'admin' ? '/admin' : '/dashboard');
  };
  return <div className="brand" onClick={openDashboard}><span className="brand-mark"><img src="/logo.png" alt="" /></span><span>{settings.siteName || 'SAS Academy'}</span></div>;
}
