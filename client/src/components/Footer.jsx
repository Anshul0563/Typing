import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, Youtube } from 'lucide-react';
import { Brand } from './Brand.jsx';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export function Footer({ variant = 'public' }) {
  const { settings } = useSiteSettings();
  const isPublic = variant === 'public';
  const socials = [[settings.instagramUrl, Instagram, 'Instagram', 'instagram'], [settings.whatsappUrl, MessageCircle, 'WhatsApp', 'whatsapp'], [settings.youtubeUrl, Youtube, 'YouTube', 'youtube']].filter(([url]) => url);
  return <footer className={`site-footer site-footer-${variant}`}><div className="site-footer-inner"><div className="site-footer-main"><div className="site-footer-about"><Link to={isPublic ? '/' : '/dashboard'} aria-label={`${settings.siteName} home`}><Brand /></Link><p>Focused typing practice, exam-style interfaces and detailed feedback for competitive exam aspirants.</p>{socials.length > 0 && <div className="footer-socials" aria-label="Social media">{socials.map(([url, Icon, label, tone]) => <a key={label} className={`social-${tone}`} href={url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${settings.siteName} on ${label}`} title={label}><Icon /></a>)}</div>}</div><nav aria-label="Platform links"><strong>Platform</strong><Link to={isPublic ? '/' : '/dashboard'}>{isPublic ? 'Home' : 'Dashboard'}</Link><Link to="/about">About us</Link><Link to="/contact">Contact</Link></nav><nav aria-label="Legal links"><strong>Legal</strong><Link to="/terms">Terms of Service</Link><Link to="/privacy">Privacy Policy</Link><Link to="/disclaimer">Disclaimer</Link></nav><nav aria-label="Account links"><strong>Account</strong>{isPublic ? <><Link to="/login">Log in</Link><Link to="/register">Create account</Link></> : <><Link to="/profile">Profile</Link><Link to="/student-settings">Settings</Link></>}{settings.supportEmail && <a href={`mailto:${settings.supportEmail}`}>Email support</a>}</nav></div><div className="site-footer-bottom"><p>&copy; {new Date().getFullYear()} {settings.siteName}. All rights reserved.</p><span>Built for focused, responsible practice.</span></div></div></footer>;
}
