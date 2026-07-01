import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('typepath_token')) return setLoading(false);
    api('/auth/me').then(({ user: value }) => setUser(value)).catch(() => localStorage.removeItem('typepath_token')).finally(() => setLoading(false));
  }, []);
  const authenticate = (data) => { localStorage.setItem('typepath_token', data.token); setUser(data.user); };
  const value = useMemo(() => ({ user, loading, login: async (body) => { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(body) }); authenticate(data); return data; }, register: async (body) => { const data = await api('/auth/register', { method: 'POST', body: JSON.stringify(body) }); authenticate(data); return data; }, logout: () => { localStorage.removeItem('typepath_token'); setUser(null); }, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
