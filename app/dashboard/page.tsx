'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const C = {
  white: '#FFFFFF', off: '#F8FAF8', gray: '#E8EBE8',
  muted: '#9CA39C', green: '#22C55E', gd: '#16A34A',
  gl: '#4ADE80', gm: '#DCFCE7',
  black: '#0A0A0A', text: '#171717', bm: '#262626',
}

type Log = {
  id: string
  flow_name: string
  status: 'success' | 'error' | 'running'
  source: string
  payload: any
  created_at: string
}

const STATUS_STYLE: Record<string, any> = {
  success: { background: '#EEF2FF', color: '#4338CA', border: '1px solid #818CF8' },
  error: { background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' },
  running: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FB923C' },
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState<Log | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUser(data.user)
    })

    supabase
      .from('flow_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setLogs(data || [])
        setLoading(false)
      })

    // Realtime subscribe
    const channel = supabase
      .channel('flow_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'flow_logs' },
        payload => setLogs(prev => [payload.new as Log, ...prev])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = filter === 'all' ? logs : logs.filter(l => l.status === filter)

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    error: logs.filter(l => l.status === 'error').length,
    running: logs.filter(l => l.status === 'running').length,
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('th-TH', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div style={{ background: C.off, minHeight: '100vh', color: C.text }}>

      {/* Log detail modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px 16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.white,
              border: `1px solid ${C.gray}`,
              borderRadius: 20,
              width: '100%',
              maxWidth: 520,
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: 32,
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)'
            }}
          >
            <button onClick={() => setSelected(null)} style={{
              position: 'absolute', top: 20, right: 20,
              width: 32, height: 32, borderRadius: '50%',
              border: `1px solid ${C.gray}`, background: C.off,
              color: C.muted, cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
                letterSpacing: '.02em', textTransform: 'uppercase', ...STATUS_STYLE[selected.status]
              }}>{selected.status}</span>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{selected.source}</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.text, marginBottom: 8 }}>{selected.flow_name}</h2>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>{formatTime(selected.created_at)}</p>

            <p style={{ fontSize: 11, color: '#059669', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Payload</p>
            <pre style={{
              fontSize: 12, color: '#374151', background: C.off,
              border: `1px solid ${C.gray}`, borderRadius: 12,
              padding: 16, overflowX: 'auto', lineHeight: 1.7,
              fontFamily: 'ui-monospace, monospace'
            }}>
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* ---- NAVBAR ---- */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${C.gray}`, background: C.white, position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>NPH</div>
        </a>
        <div style={{ display: 'flex', gap: 3, background: C.off, padding: '3px', borderRadius: 10, border: `1px solid ${C.gray}` }}>
          <a href="/cv" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>CV</a>
          <a href="/dashboard" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'C.green', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Logs</a>
          <a href="/tasks" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>Tasks</a>
          <a href="/snippets" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>Snippets</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: C.muted }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ fontSize: 11, padding: '5px 14px', border: `1px solid ${C.gray}`, borderRadius: 7, background: 'transparent', color: C.muted, cursor: 'pointer' }}>log out</button>
        </div>
      </nav>

      {/* Header */}
      <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Automation Logs</h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{user?.email}</p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#ecfdf5', padding: '8px 16px', borderRadius: 24,
          border: '1px solid #a7f3d0'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>Realtime</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 16, padding: '24px 32px' }}>
        {[
          { label: 'Total runs', val: stats.total, color: C.text, bg: '#ffffff', borderColor: '#e5e7eb' },
          { label: 'Success', val: stats.success, color: '#059669', bg: '#ecfdf5', borderColor: '#a7f3d0' },
          { label: 'Errors', val: stats.error, color: '#dc2626', bg: '#fef2f2', borderColor: '#fecaca' },
          { label: 'Running', val: stats.running, color: '#d97706', bg: '#fffbeb', borderColor: '#fde68a' },
        ].map(s => (
          <div key={s.label} style={{
            background: s.bg,
            border: `1px solid ${s.borderColor}`,
            borderRadius: 16,
            padding: 20,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <p style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontWeight: 600 }}>{s.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, padding: '0 32px 20px' }}>
        {['all', 'success', 'error', 'running'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            fontSize: 12, padding: '8px 20px', borderRadius: 24, cursor: 'pointer',
            border: filter === f ? '1px solid #10b981' : '1px solid #e5e7eb',
            background: filter === f ? '#059669' : '#ffffff',
            color: filter === f ? '#ffffff' : '#6b7280',
            fontWeight: 600,
            textTransform: 'capitalize',
            transition: 'all 0.2s'
          }}>{f}</button>
        ))}
      </div>

      {/* Log list */}
      <div style={{
        margin: '0 32px 32px',
        background: C.white,
        borderRadius: 20,
        border: `1px solid ${C.gray}`,
        overflow: 'hidden'
      }}>
        {loading && (
          <p style={{ padding: '40px', fontSize: 14, color: C.muted, textAlign: 'center' }}>Loading...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: '40px', fontSize: 14, color: C.muted, textAlign: 'center' }}>ยังไม่มี log ในหมวดนี้</p>
        )}
        {filtered.map((log, index) => (
          <div
            key={log.id}
            onClick={() => setSelected(log)}
            style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 24px',
              borderBottom: index < filtered.length - 1 ? '1px solid #f3f4f6' : 'none',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
          >
            <span style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 20,
              fontWeight: 600, minWidth: 72, textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '.02em', ...STATUS_STYLE[log.status]
            }}>{log.status}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827' }}>{log.flow_name}</span>
            <span style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 20,
              background: '#f3f4f6', border: `1px solid ${C.gray}`, color: C.muted, fontWeight: 500
            }}>{log.source}</span>
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap', fontWeight: 500 }}>{formatTime(log.created_at)}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  )
}
