import { Link } from 'react-router-dom';
import { Brand } from './Brand.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export function Footer({ variant = 'public' }) {
  const { settings } = useSiteSettings();
  const isPublic = variant === 'public';
  return <footer className={`site-footer site-footer-${variant}`}><div className="site-footer-inner"><div className="site-footer-about">{isPublic && <Link to="/" aria-label={`${settings.siteName} home`}><Brand /></Link>}<p>Focused typing practice for competitive exams.</p></div>{isPublic && <nav aria-label="Footer navigation"><Link to="/login">Log in</Link><Link to="/register">Create account</Link></nav>}<p className="site-footer-copyright">&copy; {new Date().getFullYear()} {settings.siteName}. All rights reserved.</p></div></footer>;
}
