import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { generateAesKey, encryptFile } from '../utils/crypto';

export default function UserUpload() {
  const [authed, setAuthed] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState('');
  const [printType, setPrintType] = useState('bw');
  const [watermarkText, setWatermarkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token && role === 'user') {
      setAuthed(true);
      setAuthMessage('You are logged in as user. You can upload documents now.');
    } else {
      setAuthMessage('Please login or create a user account before uploading.');
    }
  }, []);

  async function handleUserLogin(e) {
    e.preventDefault();
    setAuthMessage('');
    try {
      setAuthLoading(true);
      const res = await api.post('/auth/user', { email: authEmail, password: authPassword });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'user');
      localStorage.setItem('userEmail', res.data.user.email);
      setAuthed(true);
      setAuthMessage('Login successful. You can upload your file now.');
    } catch (err) {
      console.error(err);
      setAuthMessage(err.response?.data?.message || 'Login failed');
      setAuthed(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleUserRegister(e) {
    e.preventDefault();
    setAuthMessage('');
    try {
      setAuthLoading(true);
      const res = await api.post('/auth/register', {
        email: authEmail,
        password: authPassword,
        role: 'user'
      });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('role', 'user');
      localStorage.setItem('userEmail', res.data.user.email);
      setAuthed(true);
      setAuthMessage('Account created and logged in. You can upload your file now.');
    } catch (err) {
      console.error(err);
      setAuthMessage(err.response?.data?.message || 'Account creation failed');
      setAuthed(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!authed) {
      setError('Please login or create a user account first.');
      return;
    }
    if (!file) {
      setError('Please choose a file');
      return;
    }
    try {
      setLoading(true);
      const { key, b64 } = await generateAesKey();
      const encryptedBlob = await encryptFile(file, key);

      const formData = new FormData();
      formData.append('file', encryptedBlob, file.name);
      formData.append('pageCount', pageCount || '');
      formData.append('printType', printType);
      formData.append('watermarkText', watermarkText);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const job = res.data;
      // Store token + key in session for token display page
      sessionStorage.setItem(
        'lastJob',
        JSON.stringify({
          ...job,
          keyB64: b64
        })
      );
      navigate('/user/token');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Upload & encrypt document</h1>
      <p className="text-sm text-slate-300 mb-4">
        Files are encrypted in your browser with AES-256 before upload. The print shop will only
        see basic metadata.
      </p>

      <div className="mb-6 border border-slate-800 rounded-lg p-4 bg-slate-900/50 space-y-3">
        <h2 className="text-sm font-semibold">User account</h2>
        <p className="text-xs text-slate-300">
          Create a user account or login to manage your encrypted print jobs.
        </p>
        <form className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
          <div className="md:col-span-1">
            <label className="block text-xs mb-1">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs"
            />
          </div>
          <div className="md:col-span-1">
            <label className="block text-xs mb-1">Password</label>
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs"
            />
          </div>
          <div className="flex gap-2 md:justify-end mt-2 md:mt-0">
            <button
              onClick={handleUserLogin}
              disabled={authLoading}
              className="inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-700 disabled:opacity-60"
            >
              Login
            </button>
            <button
              onClick={handleUserRegister}
              disabled={authLoading}
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              Create user
            </button>
          </div>
        </form>
        {authMessage && <p className="text-xs text-slate-300">{authMessage}</p>}
        {!authed && (
          <p className="text-xs text-amber-400">
            You are not logged in. Upload will fail until you login or create an account.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">File</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400"
          />
          {file && (
            <p className="text-xs text-slate-400 mt-1">
              {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Estimated pages</label>
            <input
              type="number"
              min="1"
              value={pageCount}
              onChange={(e) => setPageCount(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Print type</label>
            <select
              value={printType}
              onChange={(e) => setPrintType(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
            >
              <option value="bw">Black &amp; White</option>
              <option value="color">Color</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Watermark (optional)</label>
          <input
            type="text"
            value={watermarkText}
            onChange={(e) => setWatermarkText(e.target.value)}
            placeholder="For official use only"
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {loading ? 'Encrypting & uploading…' : 'Encrypt & upload'}
        </button>
      </form>
    </div>
  );
}


