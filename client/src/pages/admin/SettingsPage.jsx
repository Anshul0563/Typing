import { useEffect, useState } from 'react';
import { Save, Settings } from 'lucide-react';
import { api } from '../../services/api.js';
import { Button } from '../../components/Button.jsx';
import { Notice } from '../../components/Toast.jsx';
import { Loader } from '../../components/Loader.jsx';

export default function SettingsPage() {
  const [form, setForm] = useState(null); const [notice, setNotice] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const load = () => { setError(''); api('/admin/settings').then((data) => setForm(data.settings)).catch((e) => setError(e.message)); };
  useEffect(load, []);
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(''); try { const data = await api('/admin/settings', { method: 'PUT', body: JSON.stringify(form) }); setForm(data.settings); setNotice('Website settings saved successfully.'); } catch (e) { setError(e.message); } finally { setSaving(false); } };
  return <><div className="admin-page-heading"><div><span>Configuration</span><h1>Website settings</h1><p>Control public-facing details from one place.</p></div></div><Notice type="success">{notice}</Notice><Notice>{error}</Notice>{!form && !error && <Loader label="Loading settings…" />}{!form && error && <Button onClick={load}>Try again</Button>}{form && <form className="admin-settings-card" onSubmit={save}><div className="admin-settings-intro"><span><Settings /></span><div><h2>General preferences</h2><p>These details are stored centrally for SAS Academy.</p></div></div><div className="admin-settings-fields"><label>Website name<input required value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} /></label><label>Support email<input type="email" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} placeholder="support@example.com" /></label><label>Dashboard announcement<textarea rows="4" maxLength="240" value={form.announcement} onChange={(e) => setForm({ ...form, announcement: e.target.value })} placeholder="Optional message for students" /><small>{form.announcement.length}/240 characters</small></label><label className="admin-maintenance-toggle"><span><strong>Maintenance mode</strong><small>Reserve the platform while performing administrative work.</small></span><input type="checkbox" checked={form.maintenanceMode} onChange={(e) => setForm({ ...form, maintenanceMode: e.target.checked })} /></label></div><div className="admin-settings-actions"><Button disabled={saving}><Save />{saving ? 'Saving…' : 'Save settings'}</Button></div></form>}</>;
}
