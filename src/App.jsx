import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import UserUpload from "./pages/UserUpload";
import ShopDashboard from "./pages/ShopDashboard";

function App() {
  console.log("App component mounted");
  
  return (
    <BrowserRouter>
      {/* BACKGROUND VIDEO - Always running */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -2,
        overflow: 'hidden'
      }}>
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <source src="/170080-842720194.mp4" type="video/mp4" />
        </video>
        {/* Overlay to darken video */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          zIndex: 1
        }}></div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{
        minHeight: '100vh',
        width: '100%',
        color: '#f1f5f9',
        padding: 'clamp(0.5rem, 5vw, 2rem)',
        margin: 0,
        overflow: 'auto',
        position: 'relative',
        zIndex: 1,
        boxSizing: 'border-box'
      }}>
        <header style={{
          maxWidth: '80rem',
          margin: '0 auto',
          marginBottom: 'clamp(1rem, 5vw, 2rem)',
          paddingTop: '1rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #1e293b',
          animation: 'slideInDown 0.8s ease-out'
        }}>
          <style>{`
            @keyframes slideInDown {
              from { transform: translateY(-30px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
            @media (max-width: 640px) {
              header {
                margin-bottom: 1rem !important;
              }
            }
          `}</style>
          <h1 style={{
            fontSize: 'clamp(1.25rem, 6vw, 1.5rem)',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '0.5rem',
            color: 'white',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>🔐 SecurePrintHub</h1>
          <p style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: 'clamp(0.75rem, 4vw, 0.875rem)',
            marginTop: '0.25rem'
          }}>Peer-to-Peer Encrypted Printing</p>
        </header>
        <main style={{
          maxWidth: '80rem',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user/upload" element={<UserUpload />} />
            <Route path="/shop/dashboard" element={<ShopDashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;