import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold mb-4">Privacy-first cloud printing</h1>
      <p className="text-slate-300 mb-6">
        Secure PrintHub lets you encrypt documents in your browser, share a short print token or QR,
        and print at shops without exposing your files or phone number.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
          <h2 className="font-medium mb-2">For users</h2>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 mb-3">
            <li>Encrypts files locally with AES-256</li>
            <li>Generates one-time 6-digit print token</li>
            <li>Auto-deletes after printing or on demand</li>
          </ul>
          <Link
            to="/user/upload"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Go to Upload
          </Link>
        </div>
        <div className="border border-slate-800 rounded-xl p-4 bg-slate-900/40">
          <h2 className="font-medium mb-2">For print shops</h2>
          <ul className="text-sm text-slate-300 list-disc list-inside space-y-1 mb-3">
            <li>See only metadata (pages, size, type)</li>
            <li>No file downloads or previews</li>
            <li>Track completed prints</li>
          </ul>
          <Link
            to="/shop/login"
            className="inline-flex items-center justify-center rounded-md bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-700"
          >
            Shop Login
          </Link>
        </div>
      </div>
    </div>
  );
}


