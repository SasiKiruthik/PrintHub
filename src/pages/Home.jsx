import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: 'clamp(2rem, 6vw, 4rem) 0' }}>
      
      {/* HERO */}
      <div className="animate-fadeInUp" style={{ textAlign: 'center', marginBottom: 'clamp(2.5rem, 8vw, 4rem)' }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--emerald-glow)',
          border: '1px solid rgba(16,185,129,0.2)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--emerald-bright)',
          marginBottom: '1.5rem'
        }}>
          ✨ Privacy-First Printing
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 8vw, 3.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          marginBottom: '1.25rem'
        }}>
          <span style={{ color: 'var(--text-primary)' }}>Print documents</span>
          <br />
          <span className="gradient-text">without exposing them</span>
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 3vw, 1.2rem)',
          color: 'var(--text-secondary)',
          maxWidth: '580px',
          margin: '0 auto',
          lineHeight: 1.7
        }}>
          Your files are encrypted on your device. The shop prints them
          <strong style={{ color: 'var(--text-primary)' }}> without ever seeing the content</strong>.
          No WhatsApp. No USB. No exposure.
        </p>
      </div>

      {/* HOW IT WORKS */}
      <div className="animate-fadeInUp delay-2" style={{ marginBottom: 'clamp(2.5rem, 8vw, 4rem)' }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: 'clamp(1.125rem, 4vw, 1.375rem)',
          fontWeight: 700,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '2rem'
        }}>
          How it works
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          {[
            { num: '1', icon: '📤', title: 'Upload & Encrypt', desc: 'Pick any file — it gets encrypted right in your browser with AES-256', color: 'var(--emerald)' },
            { num: '2', icon: '🔢', title: 'Share Passcode', desc: 'Tell the shop your 6-digit passcode verbally. That\'s it — nothing else needed', color: 'var(--blue)' },
            { num: '3', icon: '🖨️', title: 'Silent Print', desc: 'Shop enters the passcode → document prints directly. They never see the content', color: 'var(--violet)' }
          ].map((step, i) => (
            <div key={i} className="glass-card animate-fadeInUp" style={{ animationDelay: `${0.3 + i * 0.15}s`, textAlign: 'center', padding: 'clamp(1.5rem, 4vw, 2rem)' }}>
              <div style={{
                fontSize: '2.5rem', marginBottom: '1rem',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
              }}>{step.icon}</div>
              <div style={{
                fontSize: '0.6875rem', fontWeight: 700,
                color: step.color, textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: '0.5rem'
              }}>Step {step.num}</div>
              <h3 style={{
                fontSize: '1.125rem', fontWeight: 700,
                color: 'var(--text-primary)', marginBottom: '0.5rem'
              }}>{step.title}</h3>
              <p style={{
                fontSize: '0.875rem', color: 'var(--text-secondary)',
                lineHeight: 1.6
              }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ROLE CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 'clamp(1.25rem, 4vw, 2rem)',
        maxWidth: '800px',
        margin: '0 auto',
        marginBottom: 'clamp(2.5rem, 8vw, 4rem)'
      }}>
        {/* Student Card */}
        <div className="glass-card glow-emerald animate-fadeInUp delay-4"
          style={{ cursor: 'default' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
              background: 'var(--emerald-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>👨‍🎓</div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>For Students</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload from any browser</p>
            </div>
          </div>
          <p style={{
            fontSize: '0.9rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, marginBottom: '1.5rem'
          }}>
            Encrypt your documents locally and send them to any print shop.
            No personal info shared. No file exposure.
          </p>
          <Link to="/upload" className="btn btn-emerald btn-full" style={{ textDecoration: 'none' }}>
            Upload File →
          </Link>
        </div>

        {/* Shop Card */}
        <div className="glass-card glow-blue animate-fadeInUp delay-5"
          style={{ cursor: 'default' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: 'var(--radius-md)',
              background: 'var(--blue-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem'
            }}>🏪</div>
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>For Print Shops</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Desktop app required</p>
            </div>
          </div>
          <p style={{
            fontSize: '0.9rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, marginBottom: '1.5rem'
          }}>
            Receive encrypted files from students. Enter their passcode to
            print directly — you never see the document content.
          </p>
          <Link to="/shop/dashboard" className="btn btn-blue btn-full" style={{ textDecoration: 'none' }}>
            Shop Dashboard →
          </Link>
        </div>
      </div>

      {/* SECURITY FEATURES */}
      <div className="glass-card animate-fadeInUp delay-6" style={{
        maxWidth: '800px', margin: '0 auto'
      }}>
        <h3 style={{
          fontSize: '1rem', fontWeight: 700,
          color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.08em', marginBottom: '1.25rem',
          textAlign: 'center'
        }}>
          🛡️ Security Stack
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem'
        }}>
          {[
            { icon: '🔐', label: 'AES-256-GCM', desc: 'Military-grade encryption', color: 'var(--emerald)' },
            { icon: '🔇', label: 'Silent Print', desc: 'No preview, no viewing', color: 'var(--blue)' },
            { icon: '✓', label: 'SHA-256', desc: 'Integrity verification', color: 'var(--amber)' },
            { icon: '🧹', label: 'Auto-Wipe', desc: 'Memory cleared after print', color: 'var(--violet)' },
            { icon: '📱', label: 'Cross-Device', desc: 'Any browser + desktop', color: 'var(--cyan)' },
            { icon: '⚡', label: 'Same Network', desc: 'Fast local transfer', color: 'var(--red)' },
          ].map((f, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '0.75rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.375rem' }}>{f.icon}</div>
              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: f.color, marginBottom: '0.25rem' }}>{f.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
