'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email หรือ Password ไม่ถูกต้อง')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      /* เปลี่ยนพื้นหลังเป็นรูปภาพตามที่ระบุ */
      backgroundImage: 'url("https://images.pexels.com/photos/1103970/pexels-photo-1103970.jpeg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: '#ffffff', /* พื้นขาว 70% */
        /* ใส่เงาให้ Pop-up ดูมีมิติลอยขึ้นมา */
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.05)',
        borderRadius: 16, padding: 32
      }}>
        <p style={{ fontSize: 13, color: '#22C55E', fontWeight: 600, letterSpacing: '.04em', marginBottom: 28 }}>
          Noar Personal Hub
        </p>

        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 13, color: '#4b5563', marginBottom: 28 }}>
          Log in เพื่อจัดการ CV และดู Flow Logs
        </p>

        {/* Email */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Email</p>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="you@email.com"
            style={{
              width: '100%', padding: '10px 14px',
              background: '#f9fafb', border: '1px solid #d1d5db',
              borderRadius: 8, color: '#111827', fontSize: 13,
              outline: 'none', transition: 'border 0.2s'
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: '#22C55E', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 6 }}>Password</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={{
              width: '100%', padding: '10px 14px',
              background: '#f9fafb', border: '1px solid #d1d5db',
              borderRadius: 8, color: '#111827', fontSize: 13,
              outline: 'none', transition: 'border 0.2s'
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{
            fontSize: 12, color: '#dc2626', marginBottom: 16,
            padding: '8px 12px', background: '#fee2e2',
            borderRadius: 8, border: '1px solid #fca5a5'
          }}>{error}</p>
        )}

        {/* Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '11px',
            background: loading ? '#86efac' : '#22C55E',
            border: 'none', borderRadius: 8, fontWeight: 600,
            color: '#ffffff', fontSize: 13, cursor: 'pointer',
            letterSpacing: '.04em', transition: 'background .2s, transform .1s',
            opacity: loading ? .7 : 1
          }}
        >
          {loading ? 'กำลังเข้าสู่ระบบ...' : 'Log in →'}
        </button>

        <p style={{ fontSize: 12, marginTop: 20, textAlign: 'center' }}>
          <a href="/" style={{ color: '#22C55E', textDecoration: 'none', fontWeight: 500 }}>← กลับหน้า CV</a>
        </p>
      </div>
    </div>
  )
}
