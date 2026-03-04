import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import UserUpload from './pages/UserUpload';
import ShopDashboard from './pages/ShopDashboard';

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      
      {/* HEADER */}
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-lg text-emerald-400">
            Secure PrintHub
          </span>
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link to="/user/upload" className="hover:text-emerald-300">
            Student
          </Link>
          <Link to="/shop/dashboard" className="hover:text-emerald-300">
            Print Shop
          </Link>
        </nav>
      </header>

      {/* MAIN ROUTES */}
      <main className="flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user/upload" element={<UserUpload />} />
          <Route path="/shop/dashboard" element={<ShopDashboard />} />
        </Routes>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 text-center">
        Peer-to-peer secure printing. Files are encrypted with AES-256-GCM 
        locally and transmitted directly via WebRTC. No server storage. 
        No plaintext exposure.
      </footer>
    </div>
  );
}

export default App;