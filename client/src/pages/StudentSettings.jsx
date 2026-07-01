import { useState } from 'react';
import { Bell, Check, Moon, Sun } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext.jsx';

export default function StudentSettings() {
  const { settings } = useSiteSettings();
  const current = localStorage.getItem('typepath_theme') || 'light'; const [theme, setTheme] = useState(current); const [notices, setNotices] = useState(() => localStorage.getItem('typepath_reminders') !== 'false'); const [saved, setSaved] = useState(false);
  const chooseTheme = (value) => { setTheme(value); document.documentElement.dataset.theme = value; localStorage.setItem('typepath_theme', value); window.dispatchEvent(new CustomEvent('typepath:theme', { detail: value })); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  const chooseNotices = (value) => { setNotices(value); localStorage.setItem('typepath_reminders', String(value)); setSaved(true); setTimeout(() => setSaved(false), 1600); };
  return <><div className="student-page-title"><div><span>Preferences</span><h1>Settings</h1><p>Make your practice environment feel comfortable and focused.</p></div>{saved && <span className="saved-pill"><Check />Saved</span>}</div><div className="student-settings-grid"><section className="preference-card"><div className="preference-title"><span><Sun /></span><div><h2>Appearance</h2><p>Choose how {settings.siteName} looks on this device.</p></div></div><div className="theme-options">{[['light', Sun, 'Light'], ['dark', Moon, 'Dark']].map(([value, Icon, label]) => <button type="button" className={theme === value ? 'selected' : ''} key={value} onClick={() => chooseTheme(value)}><Icon /><span>{label}</span>{theme === value && <Check />}</button>)}</div></section><section className="preference-card"><div className="preference-title"><span><Bell /></span><div><h2>Notifications</h2><p>Control helpful practice reminders.</p></div></div><label className="setting-switch"><span><strong>Practice reminders</strong><small>Remember this preference on this device.</small></span><input type="checkbox" checked={notices} onChange={(e) => chooseNotices(e.target.checked)} /></label></section></div></>;
}
