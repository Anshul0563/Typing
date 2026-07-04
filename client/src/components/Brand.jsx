import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export function Brand() {
  const { settings } = useSiteSettings();
  return <div className="brand"><span className="brand-mark"><img src="/logo.png" alt="" /></span><span>{settings.siteName || 'SAS Academy'}</span></div>;
}
