import React from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import UserUpload from './pages/UserUpload';
import TokenDisplay from './pages/TokenDisplay';
import ShopLogin from './pages/ShopLogin';
import ShopDashboard from './pages/ShopDashboard';

function useAuth() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  return { token, role };
}

function ProtectedRoute({ children, role }) {
  const { token, role: currentRole } = useAuth();
  if (!token || (role && currentRole !== role)) {
    return <Navigate to={role === 'shop' ? '/shop/login' : '/'} replace />;
  }
  return children;
}

function App() {
  const navigate = useNavigate();
  const { token, role } = useAuth();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-lg text-emerald-400">Secure PrintHub</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/user/upload" className="hover:text-emerald-300">
            User Upload
          </Link>
          <Link to="/shop/login" className="hover:text-emerald-300">
            Shop
          </Link>
          {token && (
            <button
              onClick={logout}
              className="text-xs border border-slate-700 rounded px-2 py-1 hover:bg-slate-800"
            >
              Logout ({role})
            </button>
          )}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user/upload" element={<UserUpload />} />
          <Route path="/user/token" element={<TokenDisplay />} />
          <Route path="/shop/login" element={<ShopLogin />} />
          <Route
            path="/shop/dashboard"
            element={
              <ProtectedRoute role="shop">
                <ShopDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <footer className="border-t border-slate-800 px-4 py-3 text-xs text-slate-500 text-center">
        End-to-end encrypted cloud printing prototype. Files are encrypted in your browser with AES-256.
      </footer>
    </div>
  );
}

export default App;


