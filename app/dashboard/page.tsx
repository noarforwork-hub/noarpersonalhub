'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Log = {
  id: string
  flow_name: string
  status: 'success' | 'error' | 'running'
  source: string
  payload: any
  created_at: string
}

const STATUS_STYLE: Record<string, any> = {
  success: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
  error:   { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  running: { background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a' },
}

export default function DashboardPage() {
  const [logs, setLogs]       = useState<Log[]>([])
  const [filter, setFilter]   = useState('all')
  const [selected, setSelected] = useState<Log | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser]       = useState<any>(null)
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
    total:   logs.length,
    success: logs.filter(l => l.status === 'success').length,
    error:   logs.filter(l => l.status === 'error').length,
    running: logs.filter(l => l.status === 'running').length,
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('th-TH', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div style={{ background: '#fafafa', minHeight: '100vh', color: '#1a1a1a' }}>

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
              background: '#ffffff', 
              border: '1px solid #e5e7eb',
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
              border: '1px solid #e5e7eb', background: '#f9fafb',
              color: '#6b7280', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s'
            }}>✕</button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{
                fontSize: 11, padding: '4px 12px', borderRadius: 20, fontWeight: 600,
                letterSpacing: '.02em', textTransform: 'uppercase', ...STATUS_STYLE[selected.status]
              }}>{selected.status}</span>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{selected.source}</span>
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{selected.flow_name}</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>{formatTime(selected.created_at)}</p>

            <p style={{ fontSize: 11, color: '#059669', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Payload</p>
            <pre style={{
              fontSize: 12, color: '#374151', background: '#f9fafb',
              border: '1px solid #e5e7eb', borderRadius: 12,
              padding: 16, overflowX: 'auto', lineHeight: 1.7,
              fontFamily: 'ui-monospace, monospace'
            }}>
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Navbar — same style as cv-client.tsx */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid #E8EBE8',
        background: '#FFFFFF',
        position: 'sticky', top: 0, zIndex: 50
      }}>
        <a href="/" style={{ textDecoration: 'none', fontWeight: 700, fontSize: 18, letterSpacing: '.04em' }}>
          <span style={{ color: '#171717' }}>N</span>
          <span style={{ color: '#22C55E' }}>PH</span>
        </a>
        <div style={{ display: 'flex', gap: 4, background: '#F8FAF8', padding: '3px', borderRadius: 10, border: '1px solid #E8EBE8' }}>
          <a href="/cv" style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 8, fontSize: 12, cursor: 'pointer', border: 'none', letterSpacing: '.04em', textTransform: 'uppercase' as const, background: 'transparent', color: '#9CA39C', fontWeight: 500, textDecoration: 'none', lineHeight: '20px' }}>CV</a>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 8, fontSize: 12, letterSpacing: '.04em', textTransform: 'uppercase' as const, background: '#22C55E', color: '#FFFFFF', fontWeight: 500, lineHeight: '20px' }}>Logs</span>
        </div>
        <button onClick={handleLogout} style={{
          fontSize: 12, padding: '5px 16px',
          border: '1px solid #E8EBE8', borderRadius: 8,
          background: 'transparent', color: '#9CA39C', cursor: 'pointer', letterSpacing: '.04em'
        }}>log out</button>
      </nav>

      {/* Header */}
      <div style={{ padding: '32px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em' }}>Automation Logs</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 6 }}>{user?.email}</p>
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
          { label: 'Total runs', val: stats.total,   color: '#111827', bg: '#ffffff', borderColor: '#e5e7eb' },
          { label: 'Success',    val: stats.success, color: '#059669', bg: '#ecfdf5', borderColor: '#a7f3d0' },
          { label: 'Errors',     val: stats.error,   color: '#dc2626', bg: '#fef2f2', borderColor: '#fecaca' },
          { label: 'Running',    val: stats.running, color: '#d97706', bg: '#fffbeb', borderColor: '#fde68a' },
        ].map(s => (
          <div key={s.label} style={{ 
            background: s.bg, 
            border: `1px solid ${s.borderColor}`, 
            borderRadius: 16, 
            padding: 20,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <p style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, fontWeight: 600 }}>{s.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, padding: '0 32px 20px' }}>
        {['all','success','error','running'].map(f => (
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
        background: '#ffffff', 
        borderRadius: 20, 
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {loading && (
          <p style={{ padding: '40px', fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>Loading...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p style={{ padding: '40px', fontSize: 14, color: '#9ca3af', textAlign: 'center' }}>ยังไม่มี log ในหมวดนี้</p>
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
              background: '#f3f4f6', border: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 500
            }}>{log.source}</span>
            <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap', fontWeight: 500 }}>{formatTime(log.created_at)}</span>
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
