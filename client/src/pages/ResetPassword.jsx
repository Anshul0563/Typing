import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Brand } from '../components/Brand.jsx';
import { Button } from '../components/Button.jsx';
import { Notice } from '../components/Toast.jsx';
import { api } from '../services/api.js';

export default function ResetPassword() {
  const [params] = useSearchParams(); const navigate = useNavigate(); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const token = params.get('token');
  const submit = async (event) => { event.preventDefault(); setBusy(true); try { const data = await api('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }); localStorage.setItem('typepath_token', data.token); navigate(data.user.role === 'admin' ? '/admin' : '/dashboard'); window.location.reload(); } catch (e) { setError(e.message); setBusy(false); } };
  return <main className="auth-page"><Link to="/"><Brand /></Link><section className="auth-card"><h1>Choose a new password</h1><p>The new password must contain at least eight characters, including a letter and number.</p><Notice>{!token ? 'This reset link is incomplete.' : error}</Notice>{token && <form onSubmit={submit}><label>New password<input type="password" minLength="8" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} /></label><Button disabled={busy}>{busy ? 'Updating…' : 'Reset password'}</Button></form>}<p className="auth-switch"><Link to="/login">Return to login</Link></p></section></main>;
}
