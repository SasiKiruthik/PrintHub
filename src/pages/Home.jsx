import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: '2rem 0', position: 'relative', zIndex: 10 }}>
      <style>{`
        @keyframes zoomIn {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInDown {
          0% { transform: translateY(-50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideInUp {
          0% { transform: translateY(50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>

      {/* HERO VIDEO - ANIMATES IN */}
      <div style={{ 
        marginBottom: '3rem', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        border: '2px solid #10b981',
        backgroundColor: '#000',
        boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
        animation: 'zoomIn 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <div style={{ position: 'relative', width: '100%', backgroundColor: '#000', aspectRatio: '16/9', maxHeight: '400px' }}>
          <video autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}>
            <source src="/13232-246463976.mp4" type="video/mp4" />
          </video>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, transparent 0%, rgba(15, 23, 42, 0.7) 100%)', opacity: '0.5' }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', textShadow: '0 4px 12px rgba(0,0,0,0.9)', animation: 'pulse 2s ease-in-out infinite' }}>
              🔐 Secure P2P Printing
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ color: 'white', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', animation: 'slideInDown 0.8s ease-out 0.2s both', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          Secure PrintHub
        </h1>
        
        <p style={{ color: '#cbd5e1', marginBottom: '3rem', lineHeight: '1.8', fontSize: '1.1rem', animation: 'slideInDown 0.8s ease-out 0.4s both' }}>
          Privacy-preserving peer-to-peer printing system. Documents are encrypted locally in your browser using AES-256-GCM. No servers. No tracking. Zero-knowledge.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
          {/* STUDENT CARD */}
          <div style={{ border: '2px solid #10b981', padding: '2.5rem', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.05)', backdropFilter: 'blur(10px)', animation: 'slideInUp 0.8s ease-out 0.6s both', boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(16, 185, 129, 0.3)'; e.currentTarget.style.transform = 'translateY(-5px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h2 style={{ color: '#10b981', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>👨‍🎓 For Students</h2>
            <p style={{ color: '#cbd5e1', marginBottom: '2rem', lineHeight: '1.6' }}>Securely upload your documents. Generate a passcode, encrypt your files, and send them directly to the print shop through peer-to-peer connection.</p>
            <ul style={{ color: '#aaa', marginBottom: '2rem', lineHeight: '2' }}>
              <li>✓ Generate 6-digit passcode</li>
              <li>✓ Encrypt files locally</li>
              <li>✓ Secure P2P transfer</li>
            </ul>
            <Link to="/user/upload" style={{ color: '#000', backgroundColor: '#10b981', padding: '0.875rem 2rem', borderRadius: '8px', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; }}>
              → Start Upload
            </Link>
          </div>

          {/* SHOP CARD */}
          <div style={{ border: '2px solid #3b82f6', padding: '2.5rem', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.05)', backdropFilter: 'blur(10px)', animation: 'slideInUp 0.8s ease-out 0.8s both', boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.3)'; e.currentTarget.style.transform = 'translateY(-5px)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.1)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <h2 style={{ color: '#3b82f6', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>🏪 For Print Shops</h2>
            <p style={{ color: '#cbd5e1', marginBottom: '2rem', lineHeight: '1.6' }}>Receive encrypted files from students. Validate their identity with a passcode, decrypt files securely, and print directly without storing anything.</p>
            <ul style={{ color: '#aaa', marginBottom: '2rem', lineHeight: '2' }}>
              <li>✓ Validate student passcode</li>
              <li>✓ Decrypt in memory only</li>
              <li>✓ Direct print workflow</li>
            </ul>
            <Link to="/shop/dashboard" style={{ color: '#fff', backgroundColor: '#3b82f6', padding: '0.875rem 2rem', borderRadius: '8px', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; }}>
              → Shop Dashboard
            </Link>
          </div>
        </div>

        {/* FEATURES */}
        <div style={{ padding: '3rem', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.6)', backdropFilter: 'blur(10px)', border: '1px solid rgba(148, 163, 184, 0.2)', animation: 'slideInUp 0.8s ease-out 1s both' }}>
          <h3 style={{ color: '#10b981', marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold' }}>🛡️ Security Features</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
            <div><p style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '0.5rem' }}>🔐 AES-256-GCM Encryption</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Military-grade encryption for all files</p></div>
            <div><p style={{ color: '#3b82f6', fontWeight: 'bold', marginBottom: '0.5rem' }}>🌐 WebRTC P2P</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Direct peer-to-peer connection, no servers</p></div>
            <div><p style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.5rem' }}>✓ SHA-256 Verification</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>File integrity verification included</p></div>
            <div><p style={{ color: '#ec4899', fontWeight: 'bold', marginBottom: '0.5rem' }}>🔪 Zero-Knowledge</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>No file storage, no tracking, no logs</p></div>
            <div><p style={{ color: '#8b5cf6', fontWeight: 'bold', marginBottom: '0.5rem' }}>📱 Cross-Device</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Works on mobile, laptop, desktop</p></div>
            <div><p style={{ color: '#06b6d4', fontWeight: 'bold', marginBottom: '0.5rem' }}>⚡ Real-Time</p><p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>Instant encrypted file transfer</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
