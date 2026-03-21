import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import StudentUpload from "./pages/StudentUpload";
import ShopDashboard from "./pages/ShopDashboard";

function App() {
  return (
    <HashRouter>
      {/* Ambient background */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        zIndex: -2, overflow: 'hidden', pointerEvents: 'none'
      }}>
        {/* Gradient orbs */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)', borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)', borderRadius: '50%'
        }} />
      </div>

      {/* Main content */}
      <div style={{
        minHeight: '100vh', width: '100%',
        position: 'relative', zIndex: 1
      }}>
        {/* Header */}
        <header className="animate-fadeInDown" style={{
          maxWidth: '80rem', margin: '0 auto',
          padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 5vw, 2rem)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '12px'
        }}>
          <a href="#/" style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔐</span>
            <span style={{
              fontSize: 'clamp(1.125rem, 4vw, 1.375rem)',
              fontWeight: 800, letterSpacing: '-0.02em'
            }}>
              <span className="gradient-text">Secure</span>
              <span style={{ color: 'var(--text-primary)' }}>PrintHub</span>
            </span>
          </a>
        </header>

        <main style={{
          maxWidth: '80rem', margin: '0 auto', width: '100%',
          padding: '0 clamp(1rem, 5vw, 2rem)',
          paddingBottom: '3rem'
        }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<StudentUpload />} />
            <Route path="/shop/dashboard" element={<ShopDashboard />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;