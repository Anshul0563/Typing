import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const defaults = { siteName: 'SAS Academy', supportEmail: '', contactPhone: '', addressUrl: '', instagramUrl: '', whatsappUrl: '', youtubeUrl: '', announcement: '', maintenanceMode: false };
const SiteSettingsContext = createContext({ settings: defaults, loading: true, error: '' });
const readCachedSettings = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem('typepath_site_settings') || '{}') }; } catch { return defaults; } };

export function SiteSettingsProvider({ children }) {
  const [settings, setSettingsState] = useState(readCachedSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setSettings = (value) => { const next = { ...defaults, ...value }; setSettingsState(next); localStorage.setItem('typepath_site_settings', JSON.stringify(next)); };
  const refreshSettings = () => api('/settings')
      .then((data) => setSettings(data.settings))
      .catch((err) => setError(err.message || 'Unable to load website settings'))
      .finally(() => setLoading(false));
  useEffect(() => { refreshSettings(); }, []);
  useEffect(() => { document.title = `${settings.siteName} — Typing Practice`; }, [settings.siteName]);

  const value = useMemo(() => ({ settings, loading, error, setSettings, refreshSettings }), [settings, loading, error]);
  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export const useSiteSettings = () => useContext(SiteSettingsContext);
