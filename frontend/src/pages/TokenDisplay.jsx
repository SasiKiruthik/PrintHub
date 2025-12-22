import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import api from '../api/client';

export default function TokenDisplay() {
  const [job, setJob] = useState(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const raw = sessionStorage.getItem('lastJob');
    if (!raw) {
      setError('No recent job. Please upload a file first.');
      return;
    }
    setJob(JSON.parse(raw));
  }, []);

  if (!job) {
    return (
      <div className="max-w-xl mx-auto">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  const sharePayload = JSON.stringify({
    token: job.token,
    key: job.keyB64
  });

  async function handleDelete() {
    try {
      setDeleting(true);
      await api.delete(`/delete/${job.id}`);
      sessionStorage.removeItem('lastJob');
      navigate('/user/upload');
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  }

  const expiry = job.tokenExpiresAt ? new Date(job.tokenExpiresAt) : null;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Share token with print shop</h1>
      <p className="text-sm text-slate-300 mb-4">
        The shop will use this token and key to fetch your encrypted file. The token expires after
        first use or 10 minutes.
      </p>
      <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/60 space-y-3">
        <div className="flex justify-between text-sm">
          <div>
            <div className="text-slate-400 text-xs uppercase">File</div>
            <div>{job.fileName}</div>
          </div>
          {job.pageCount && (
            <div>
              <div className="text-slate-400 text-xs uppercase">Pages</div>
              <div>{job.pageCount}</div>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 items-center">
          <div>
            <div className="text-slate-400 text-xs uppercase mb-1">6-digit token</div>
            <div className="font-mono text-2xl tracking-[0.25em]">{job.token}</div>
            <div className="mt-3 text-slate-400 text-xs uppercase">AES key (base64)</div>
            <div className="font-mono text-[10px] break-all bg-slate-950/70 border border-slate-800 rounded px-2 py-1 mt-1">
              {job.keyB64}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeCanvas value={sharePayload} size={148} bgColor="#020617" fgColor="#22c55e" />
            <div className="mt-2 text-xs text-slate-400 text-center">
              QR encodes token + key. Show this at the shop.
            </div>
          </div>
        </div>
        {expiry && (
          <p className="text-xs text-slate-400">
            Expires at: {expiry.toLocaleTimeString()} (local time)
          </p>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center justify-center rounded-md bg-slate-900 border border-red-500/60 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
        >
          Delete job now
        </button>
      </div>
    </div>
  );
}


