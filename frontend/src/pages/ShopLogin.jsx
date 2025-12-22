import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function ShopLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      const res = await api.post('/auth/shop', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'shop');
      navigate('/shop/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Shop login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Login'}
        </button>
      </form>
      <div className="mt-3 text-xs text-slate-400 space-y-1">
        <p>Use one of the predefined demo shop accounts:</p>
        <p>
          <span className="font-mono">shop1@demo.com</span> / <span className="font-mono">Shop@1234</span>
        </p>
        <p>
          <span className="font-mono">shop2@demo.com</span> / <span className="font-mono">Shop@1234</span>
        </p>
        <p className="text-emerald-300 mt-1">Login now to access the shop dashboard and print jobs.</p>
      </div>
    </div>
  );
}


