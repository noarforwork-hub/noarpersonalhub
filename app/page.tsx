'use client'
import { useEffect, useState } from 'react'

const COLORS = {
  white: '#FFFFFF',
  offWhite: '#F8FAF8',
  lightGray: '#E8EBE8',
  mediumGray: '#9CA39C',
  green: '#22C55E',
  greenDark: '#16A34A',
  greenMuted: '#DCFCE7',
  blackLight: '#171717',
  blackMedium: '#262626',
}

export default function LandingPage() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: COLORS.white, display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

      {/* ── Navbar (10% feel — thin top bar) ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: `1px solid ${COLORS.lightGray}`,
        background: COLORS.white,
      }}>
        <a href="/" style={{ textDecoration: 'none', fontWeight: 700, fontSize: 18, letterSpacing: '.04em' }}>
          <span style={{ color: COLORS.blackLight }}>N</span>
          <span style={{ color: COLORS.green }}>PH</span>
        </a>
        <a href="/login" style={{
          fontSize: 12, padding: '5px 16px',
          border: `1px solid ${COLORS.green}`, borderRadius: 8,
          color: COLORS.green, textDecoration: 'none',
          letterSpacing: '.04em', fontWeight: 500,
        }}>log in</a>
      </nav>

      {/* ── Hero (70% — white, centered) ── */}
      <main style={{
        flex: '0 0 70vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
        background: COLORS.white,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity .6s ease, transform .6s ease',
      }}>
        {/* Label */}
        <p style={{
          fontSize: 11, color: COLORS.green, letterSpacing: '.12em',
          textTransform: 'uppercase', fontWeight: 600, marginBottom: 20,
        }}>Welcome</p>

        {/* Main heading */}
        <h1 style={{ fontSize: 'clamp(36px, 8vw, 72px)', fontWeight: 700, lineHeight: 1.1, textAlign: 'center', marginBottom: 20 }}>
          <span style={{ color: COLORS.green }}>Noar</span>
          <span style={{ color: COLORS.blackLight }}> Personal Hub</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 14, color: COLORS.mediumGray, maxWidth: 380,
          textAlign: 'center', lineHeight: 1.75, marginBottom: 40,
        }}>
          Portfolio · Automation Logs · CV — ทุกอย่างในที่เดียว
        </p>

        {/* CTA */}
        <a href="/cv" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 32px',
          background: COLORS.green, color: COLORS.white,
          border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 600, textDecoration: 'none',
          letterSpacing: '.04em',
          boxShadow: '0 4px 20px rgba(34,197,94,0.25)',
          transition: 'box-shadow .2s, transform .15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 28px rgba(34,197,94,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(34,197,94,0.25)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
        >
          Entry Site →
        </a>

        {/* Divider dots */}
        <div style={{ display: 'flex', gap: 6, marginTop: 48 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: i === 1 ? 18 : 6, height: 6, borderRadius: 3,
              background: i === 1 ? COLORS.green : COLORS.lightGray,
              transition: 'all .2s',
            }} />
          ))}
        </div>
      </main>

      {/* ── Green band (20%) ── */}
      <section style={{
        flex: '0 0 20vh', minHeight: 120,
        background: COLORS.green,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        gap: 48,
        flexWrap: 'wrap' as const,
      }}>
        {[
          { num: '01', label: 'CV & Portfolio' },
          { num: '02', label: 'Automation Logs' },
          { num: '03', label: 'Real-time Data' },
        ].map(item => (
          <div key={item.num} style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: COLORS.white, lineHeight: 1 }}>{item.num}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, letterSpacing: '.06em', textTransform: 'uppercase' as const, fontWeight: 500 }}>{item.label}</p>
          </div>
        ))}
      </section>

      {/* ── Footer (10% —white) ── */}
      <footer style={{
        flex: '0 0 10vh', minHeight: 60,
        background: COLORS.white,
        borderTop: `1px solid ${COLORS.lightGray}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 11, color: COLORS.mediumGray, letterSpacing: '.04em' }}>
          © 2025 Noar Personal Hub
        </p>
      </footer>

    </div>
  )
}