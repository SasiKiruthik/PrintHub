import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { decryptToBlob, importAesKeyFromBase64 } from '../utils/crypto';

export default function ShopDashboard() {
  const [jobs, setJobs] = useState([]);
  const [token, setToken] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState('');
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);

  async function loadJobs() {
    try {
      const res = await api.get('/shop');
      setJobs(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleVerify(e) {
    e.preventDefault();
    setStatus('');
    setSelectedJob(null);
    try {
      setLoadingVerify(true);
      const res = await api.post('/token/verify', { token });
      setSelectedJob(res.data);
      setStatus('Token valid. Ready to print.');
    } catch (err) {
      console.error(err);
      setStatus(err.response?.data?.message || 'Invalid token');
    } finally {
      setLoadingVerify(false);
    }
  }

  async function handlePrint() {
    if (!selectedJob) return;
    if (!keyInput) {
      setStatus('Enter decryption key (from customer QR/token)');
      return;
    }
    try {
      setLoadingPrint(true);
      setStatus('Fetching encrypted file…');
      const res = await api.post('/print', { token: selectedJob.token });
      const { encryptedData, mimeType, fileName, watermarkText } = res.data;

      setStatus('Decrypting and sending to printer…');
      const key = await importAesKeyFromBase64(keyInput.trim());
      const blob = await decryptToBlob(encryptedData, key, mimeType);

      // Optional: watermark for images
      let finalBlob = blob;
      if (watermarkText && mimeType.startsWith('image/')) {
        finalBlob = await applyWatermarkToImage(blob, watermarkText);
      }

      const url = URL.createObjectURL(finalBlob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
      setStatus('Printed. Job will auto-delete.');
      setSelectedJob(null);
      setToken('');
      setKeyInput('');
      loadJobs();
    } catch (err) {
      console.error(err);
      setStatus(err.response?.data?.message || 'Print failed');
    } finally {
      setLoadingPrint(false);
    }
  }

  function applyWatermarkToImage(blob, text) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.font = `${Math.round(canvas.width / 20)}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.rotate((-20 * Math.PI) / 180);
        ctx.fillText(text, canvas.width / 4, canvas.height / 2);
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to watermark'));
          },
          blob.type || 'image/png',
          0.92
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-[2fr,3fr] max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold mb-3">Shop dashboard</h1>
        <form onSubmit={handleVerify} className="space-y-3 mb-4">
          <div>
            <label className="block text-sm mb-1">Customer token (6 digits)</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength={6}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">
              Decryption key (from QR / customer) – base64
            </label>
            <input
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loadingVerify}
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {loadingVerify ? 'Checking token…' : 'Verify token'}
          </button>
        </form>
        {status && <p className="text-xs text-slate-300 mb-2">{status}</p>}
        {selectedJob && (
          <div className="border border-slate-800 rounded-xl p-3 bg-slate-900/50 text-sm space-y-2">
            <div className="flex justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase">File</div>
                <div>{selectedJob.fileName}</div>
              </div>
              {selectedJob.pageCount && (
                <div>
                  <div className="text-slate-400 text-xs uppercase">Pages</div>
                  <div>{selectedJob.pageCount}</div>
                </div>
              )}
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <div>Print type: {selectedJob.printType === 'color' ? 'Color' : 'B&W'}</div>
              <div>Status: {selectedJob.status}</div>
            </div>
            {selectedJob.watermarkText && (
              <div className="text-xs text-slate-300">
                Watermark: <span className="italic">{selectedJob.watermarkText}</span>
              </div>
            )}
            <button
              onClick={handlePrint}
              disabled={loadingPrint}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loadingPrint ? 'Printing…' : 'Print now'}
            </button>
          </div>
        )}
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Incoming print jobs</h2>
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 max-h-[400px] overflow-auto">
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-400 p-3">No pending jobs.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-slate-900/70 text-slate-400">
                <tr>
                  <th className="px-2 py-1 text-left">Token</th>
                  <th className="px-2 py-1 text-left">File</th>
                  <th className="px-2 py-1">Pages</th>
                  <th className="px-2 py-1">Type</th>
                  <th className="px-2 py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j._id} className="border-t border-slate-800/80">
                    <td className="px-2 py-1 font-mono">{j.token}</td>
                    <td className="px-2 py-1 max-w-[160px] truncate">{j.fileName}</td>
                    <td className="px-2 py-1 text-center">{j.pageCount || '-'}</td>
                    <td className="px-2 py-1 text-center">
                      {j.printType === 'color' ? 'Color' : 'B&W'}
                    </td>
                    <td className="px-2 py-1 text-center">{j.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Shops cannot download or preview files here. Printing only decrypts in the browser and
          streams to the OS print dialog.
        </p>
      </div>
    </div>
  );
}


