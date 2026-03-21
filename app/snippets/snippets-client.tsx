'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

const C = {
    white: '#FFFFFF', off: '#F8FAF8', gray: '#E8EBE8',
    muted: '#9CA39C', green: '#22C55E', gd: '#16A34A',
    gm: '#DCFCE7', black: '#0A0A0A', text: '#171717',
}

const LANGUAGES = ['Python', 'JavaScript', 'TypeScript', 'SQL', 'JSON', 'Bash', 'HTML', 'CSS']
const COMMON_TAGS = ['#Supabase', '#n8n', '#Python', '#SQL', '#LineAPI', '#Webhook', '#AI', '#Automation', '#Database', '#Next.js']

type Snippet = {
    id: string
    title: string
    description: string
    type: 'code' | 'prompt' | 'n8n'
    language: string
    content: string
    tags: string[]
    created_at: string
}

// Syntax highlight สำหรับ code
function highlight(code: string, lang: string): string {
    if (lang === 'SQL' || lang === 'sql') {
        return code
            .replace(/\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|ON|ALTER|ENABLE|ROW|LEVEL|SECURITY|POLICY|FOR|ALL|USING|DEFAULT|NOT NULL|PRIMARY KEY|REFERENCES|CHECK|IN|AND|OR|AS|WITH|JOIN|LEFT|RIGHT|INNER|ORDER|BY|DESC|ASC|LIMIT|GROUP|HAVING|DISTINCT|VALUES|NULL|CASCADE)\b/g, '<span style="color:#CBA6F7;font-weight:600">$1</span>')
            .replace(/\b(uuid|text|jsonb|timestamptz|boolean|integer|bigint|numeric|date|time)\b/g, '<span style="color:#89B4FA">$1</span>')
            .replace(/\b(gen_random_uuid|now|auth\.uid|auth\.users)\b/g, '<span style="color:#89B4FA">$1</span>')
            .replace(/'([^']*)'/g, '<span style="color:#A6E3A1">\'$1\'</span>')
            .replace(/--(.*?)$/gm, '<span style="color:#6C7086;font-style:italic">--$1</span>')
    }
    if (lang === 'Python') {
        return code
            .replace(/\b(import|from|def|return|if|else|elif|for|while|class|try|except|with|as|in|not|and|or|True|False|None|await|async)\b/g, '<span style="color:#CBA6F7;font-weight:600">$1</span>')
            .replace(/'([^']*)'/g, '<span style="color:#A6E3A1">\'$1\'</span>')
            .replace(/"([^"]*)"/g, '<span style="color:#A6E3A1">"$1"</span>')
            .replace(/#(.*?)$/gm, '<span style="color:#6C7086;font-style:italic">#$1</span>')
    }
    if (lang === 'JavaScript' || lang === 'TypeScript') {
        return code
            .replace(/\b(const|let|var|function|return|if|else|for|while|class|import|export|default|await|async|try|catch|typeof|new|this|true|false|null|undefined)\b/g, '<span style="color:#CBA6F7;font-weight:600">$1</span>')
            .replace(/`([^`]*)`/g, '<span style="color:#A6E3A1">`$1`</span>')
            .replace(/'([^']*)'/g, '<span style="color:#A6E3A1">\'$1\'</span>')
            .replace(/"([^"]*)"/g, '<span style="color:#A6E3A1">"$1"</span>')
            .replace(/\/\/(.*?)$/gm, '<span style="color:#6C7086;font-style:italic">//$1</span>')
    }
    if (lang === 'JSON') {
        return code
            .replace(/"([^"]+)":/g, '<span style="color:#89B4FA">"$1"</span>:')
            .replace(/: "([^"]*)"/g, ': <span style="color:#A6E3A1">"$1"</span>')
            .replace(/: (true|false|null)/g, ': <span style="color:#CBA6F7">$1</span>')
            .replace(/: (\d+)/g, ': <span style="color:#FAB387">$1</span>')
    }
    return code
}

// Mini n8n node renderer
function N8nFlow({ content }: { content: string }) {
    try {
        const workflow = JSON.parse(content)
        const nodes = workflow.nodes || []
        if (nodes.length === 0) return <div style={{ color: C.muted, fontSize: 12, padding: 8 }}>No nodes found</div>

        const nodeColors: Record<string, string> = {
            'n8n-nodes-base.scheduleTrigger': '#22C55E',
            'n8n-nodes-base.webhook': '#22C55E',
            'n8n-nodes-base.httpRequest': '#3B82F6',
            'n8n-nodes-base.code': '#A78BFA',
            'n8n-nodes-base.if': '#F59E0B',
            'n8n-nodes-base.slack': '#E879F9',
            'n8n-nodes-base.supabase': '#34D399',
            'n8n-nodes-base.set': '#60A5FA',
            'n8n-nodes-base.function': '#A78BFA',
        }

        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                {nodes.slice(0, 8).map((node: any, i: number) => {
                    const color = nodeColors[node.type] || '#6C7086'
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{
                                background: '#1E1E2E', border: `1.5px solid ${color}`,
                                borderRadius: 7, padding: '5px 10px',
                                fontSize: 11, color, fontWeight: 500,
                                display: 'flex', alignItems: 'center', gap: 5
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                {node.name}
                            </div>
                            {i < nodes.slice(0, 8).length - 1 && (
                                <span style={{ color: '#6C7086', fontSize: 12 }}>→</span>
                            )}
                        </div>
                    )
                })}
                {nodes.length > 8 && (
                    <span style={{ fontSize: 11, color: C.muted }}>+{nodes.length - 8} more</span>
                )}
            </div>
        )
    } catch {
        return <div style={{ color: '#f87171', fontSize: 11 }}>Invalid n8n JSON</div>
    }
}

export default function SnippetsClient() {
    const [snippets, setSnippets] = useState<Snippet[]>([])
    const [user, setUser] = useState<any>(null)
    const [loaded, setLoaded] = useState(false)
    const [filter, setFilter] = useState<'all' | 'code' | 'prompt' | 'n8n'>('all')
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [editSnippet, setEditSnippet] = useState<Snippet | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Form state
    const [form, setForm] = useState({
        title: '', description: '', type: 'code' as 'code' | 'prompt' | 'n8n',
        language: 'JavaScript', content: '', tags: [] as string[], tagInput: ''
    })

    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase])

    useEffect(() => {
        if (!user) return
        fetch('/api/snippets')
            .then(r => r.json())
            .then(data => { setSnippets(Array.isArray(data) ? data : []); setLoaded(true) })
    }, [user])

    const filtered = snippets.filter(s => {
        const matchType = filter === 'all' || s.type === filter
        const matchSearch = !search ||
            s.title.toLowerCase().includes(search.toLowerCase()) ||
            s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())) ||
            s.content.toLowerCase().includes(search.toLowerCase())
        return matchType && matchSearch
    })

    const stats = {
        code: snippets.filter(s => s.type === 'code').length,
        prompt: snippets.filter(s => s.type === 'prompt').length,
        n8n: snippets.filter(s => s.type === 'n8n').length,
    }

    async function saveSnippet() {
        if (!form.title || !form.content) return
        setSaving(true)
        const payload = {
            title: form.title,
            description: form.description,
            type: form.type,
            language: form.type === 'code' ? form.language : null,
            content: form.content,
            tags: form.tags,
        }
        if (editSnippet) {
            const res = await fetch('/api/snippets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editSnippet.id, ...payload })
            })
            const updated = await res.json()
            setSnippets(prev => prev.map(s => s.id === updated.id ? updated : s))
        } else {
            const res = await fetch('/api/snippets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            const created = await res.json()
            setSnippets(prev => [created, ...prev])
        }
        setSaving(false)
        closeForm()
    }

    async function deleteSnippet(id: string) {
        if (!confirm('ลบ snippet นี้?')) return
        await fetch('/api/snippets', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        setSnippets(prev => prev.filter(s => s.id !== id))
    }

    function copyContent(id: string, content: string) {
        navigator.clipboard.writeText(content)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    function openEdit(s: Snippet) {
        setForm({
            title: s.title, description: s.description || '',
            type: s.type, language: s.language || 'JavaScript',
            content: s.content, tags: s.tags || [], tagInput: ''
        })
        setEditSnippet(s)
        setShowForm(true)
    }

    function closeForm() {
        setShowForm(false)
        setEditSnippet(null)
        setForm({ title: '', description: '', type: 'code', language: 'JavaScript', content: '', tags: [], tagInput: '' })
    }

    function addTag(tag: string) {
        const t = tag.startsWith('#') ? tag : `#${tag}`
        if (!form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: '' }))
    }

    const inp: any = {
        width: '100%', padding: '8px 12px', background: C.white,
        border: `1px solid ${C.gray}`, borderRadius: 8,
        color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit',
    }
    const lbl: any = {
        fontSize: 10, color: C.green, fontWeight: 600,
        letterSpacing: '.07em', textTransform: 'uppercase',
        display: 'block', marginBottom: 4,
    }

    const typeBadge = (type: string) => {
        if (type === 'code') return { bg: '#1E1E2E', color: '#A6E3A1', label: 'Code' }
        if (type === 'prompt') return { bg: '#EEF2FF', color: '#4338CA', label: 'Prompt' }
        if (type === 'n8n') return { bg: '#FFF3E0', color: '#E65100', label: 'n8n' }
        return { bg: C.off, color: C.muted, label: type }
    }

    if (!user) return (
        <div style={{ background: C.off, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>กรุณา Login ก่อนครับ</p>
                <a href="/login" style={{ fontSize: 13, padding: '8px 20px', background: C.green, color: '#fff', borderRadius: 8, textDecoration: 'none' }}>Log in →</a>
            </div>
        </div>
    )

    return (
        <div style={{ background: C.off, minHeight: '100vh', color: C.text }}>

            {/* FORM MODAL */}
            {showForm && (
                <div onClick={closeForm} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto', padding: '24px 24px 40px' }}>
                        <div style={{ width: 32, height: 4, background: C.gray, borderRadius: 2, margin: '0 auto 18px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{editSnippet ? 'Edit Snippet' : 'Add Snippet'}</p>
                            <button onClick={closeForm} style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.gray}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>

                        {/* Type selector */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={lbl}>ประเภท</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {(['code', 'prompt', 'n8n'] as const).map(t => {
                                    const tb = typeBadge(t)
                                    return (
                                        <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))} style={{
                                            flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500,
                                            border: form.type === t ? `2px solid ${C.green}` : `1px solid ${C.gray}`,
                                            background: form.type === t ? C.gm : C.white,
                                            color: form.type === t ? C.gd : C.muted,
                                        }}>{tb.label}</button>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>ชื่อ</label>
                            <input style={inp} value={form.title} placeholder="ชื่อ snippet..." onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                        </div>

                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>คำอธิบาย</label>
                            <input style={inp} value={form.description} placeholder="อธิบายสั้นๆ..." onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                        </div>

                        {form.type === 'code' && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={lbl}>Language</label>
                                <select style={inp} value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </div>
                        )}

                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>{form.type === 'n8n' ? 'n8n JSON (export จาก n8n)' : form.type === 'prompt' ? 'Prompt' : 'Code'}</label>
                            <textarea
                                style={{ ...inp, resize: 'vertical', fontFamily: form.type === 'code' || form.type === 'n8n' ? 'monospace' : 'inherit', fontSize: 12 }}
                                rows={form.type === 'n8n' ? 8 : 6}
                                value={form.content}
                                placeholder={
                                    form.type === 'n8n' ? 'วาง JSON workflow จาก n8n ที่นี่...' :
                                        form.type === 'prompt' ? 'วาง prompt ที่นี่...' :
                                            'วาง code ที่นี่...'
                                }
                                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                            />
                        </div>

                        {/* Tags */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={lbl}>Tags</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {COMMON_TAGS.map(tag => (
                                    <button key={tag} onClick={() => addTag(tag)} style={{
                                        fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer',
                                        border: form.tags.includes(tag) ? `1px solid ${C.green}` : `1px solid ${C.gray}`,
                                        background: form.tags.includes(tag) ? C.gm : C.white,
                                        color: form.tags.includes(tag) ? C.gd : C.muted,
                                    }}>{tag}</button>
                                ))}
                            </div>
                            {form.tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                    {form.tags.map(tag => (
                                        <span key={tag} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.gm, color: C.gd, border: `1px solid ${C.green}`, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {tag}
                                            <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))} style={{ background: 'none', border: 'none', color: C.gd, cursor: 'pointer', fontSize: 12, lineHeight: 1, padding: 0 }}>×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input style={{ ...inp, flex: 1 }} value={form.tagInput} placeholder="พิมพ์ tag แล้วกด Enter..."
                                    onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                                    onKeyDown={e => { if (e.key === 'Enter' && form.tagInput) { addTag(form.tagInput); e.preventDefault() } }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={saveSnippet} disabled={saving} style={{ padding: '9px 24px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.6 : 1 }}>
                                {saving ? 'Saving...' : editSnippet ? 'Save Changes →' : 'Save Snippet →'}
                            </button>
                            <button onClick={closeForm} style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ---- NAVBAR ---- */}
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${C.gray}`, background: C.white, position: 'sticky', top: 0, zIndex: 10 }}>
                <a href="/" style={{ textDecoration: 'none' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>NPH</div>
                </a>
                <div style={{ display: 'flex', gap: 3, background: C.off, padding: '3px', borderRadius: 10, border: `1px solid ${C.gray}` }}>
                    <a href="/cv" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>CV</a>
                    <a href="/dashboard" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Logs</a>
                    <a href="/tasks" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Tasks</a>
                    <a href="/snippets" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: C.green, color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Snippets</a>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>{user?.email}</span>
                </div>
            </nav>

            <div style={{ padding: 16, maxWidth: 1100, margin: '0 auto' }}>

                {/* STATS */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    {[
                        { label: 'Code Snippets', val: stats.code, color: '#A6E3A1', bg: '#1E1E2E' },
                        { label: 'AI Prompts', val: stats.prompt, color: '#4338CA', bg: '#EEF2FF' },
                        { label: 'n8n Workflows', val: stats.n8n, color: '#E65100', bg: '#FFF3E0' },
                    ].map(s => (
                        <div key={s.label} style={{ flex: 1, background: C.white, border: `1px solid ${C.gray}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 8, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
                            <span style={{ fontSize: 12, color: C.muted }}>{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* TOOLBAR */}
                <div style={{ background: C.white, border: `0.5px solid ${C.gray}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderBottom: `1px solid ${C.gray}` }}>
                        <input
                            style={{ ...inp, flex: 1, minWidth: 180, background: C.off }}
                            placeholder="ค้นหา snippet, tag, content..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {(['all', 'code', 'prompt', 'n8n'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                fontSize: 11, padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                                border: filter === f ? `1px solid ${C.green}` : `1px solid ${C.gray}`,
                                background: filter === f ? C.gm : C.white,
                                color: filter === f ? C.gd : C.muted, fontWeight: 500,
                            }}>{f === 'all' ? 'All' : f === 'code' ? 'Code' : f === 'prompt' ? 'Prompt' : 'n8n'}</button>
                        ))}
                        <button onClick={() => setShowForm(true)} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}>+ Add Snippet</button>
                    </div>

                    {/* GRID */}
                    {!loaded && (
                        <div style={{ padding: 32, textAlign: 'center' }}>
                            <p style={{ fontSize: 13, color: C.muted }}>Loading...</p>
                        </div>
                    )}
                    {loaded && filtered.length === 0 && (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                            <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
                                {snippets.length === 0 ? 'ยังไม่มี snippet เพิ่มอันแรกได้เลยครับ' : 'ไม่พบ snippet ที่ค้นหา'}
                            </p>
                            {snippets.length === 0 && (
                                <button onClick={() => setShowForm(true)} style={{ fontSize: 13, padding: '8px 20px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}>+ Add Snippet</button>
                            )}
                        </div>
                    )}
                    {loaded && filtered.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, padding: 14 }}>
                            {filtered.map(s => {
                                const tb = typeBadge(s.type)
                                const isExpanded = expandedId === s.id
                                return (
                                    <div key={s.id} style={{ background: C.white, border: `1px solid ${isExpanded ? C.green : C.gray}`, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'border-color .15s' }}
                                        onClick={() => setExpandedId(isExpanded ? null : s.id)}>

                                        {/* Card header */}
                                        <div style={{ padding: '12px 14px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{s.title}</div>
                                                {s.description && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>{s.description}</div>}
                                            </div>
                                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: tb.bg, color: tb.color, fontWeight: 600, flexShrink: 0, border: s.type === 'code' ? 'none' : `0.5px solid ${tb.color}` }}>
                                                {s.type === 'code' ? (s.language || 'Code') : tb.label}
                                            </span>
                                        </div>

                                        {/* Code preview (always visible, truncated) */}
                                        {s.type === 'code' && (
                                            <div style={{ background: '#1E1E2E', padding: '8px 14px', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.7, maxHeight: isExpanded ? 'none' : 80, overflow: 'hidden', position: 'relative' }}>
                                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                                                    dangerouslySetInnerHTML={{ __html: highlight(s.content, s.language || '') }} />
                                                {!isExpanded && s.content.split('\n').length > 4 && (
                                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(transparent, #1E1E2E)' }} />
                                                )}
                                            </div>
                                        )}

                                        {/* Prompt preview */}
                                        {s.type === 'prompt' && (
                                            <div style={{ background: C.off, margin: '0 14px 4px', borderRadius: 8, padding: '8px 12px', border: `1px solid ${C.gray}` }}>
                                                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6, maxHeight: isExpanded ? 'none' : 60, overflow: 'hidden' }}>{s.content}</p>
                                            </div>
                                        )}

                                        {/* n8n flow */}
                                        {s.type === 'n8n' && (
                                            <div style={{ background: '#1A1A2E', margin: '0 14px 4px', borderRadius: 8, padding: '10px 12px', overflow: 'hidden' }}>
                                                <N8nFlow content={s.content} />
                                            </div>
                                        )}

                                        {/* Tags */}
                                        <div style={{ padding: '6px 14px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {s.tags?.map(tag => (
                                                <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.off, color: C.muted, border: `0.5px solid ${C.gray}` }}>{tag}</span>
                                            ))}
                                        </div>

                                        {/* Action buttons (show on expand) */}
                                        {isExpanded && (
                                            <div onClick={e => e.stopPropagation()} style={{ padding: '8px 14px 12px', borderTop: `1px solid ${C.gray}`, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button onClick={() => copyContent(s.id, s.content)} style={{
                                                    fontSize: 11, padding: '5px 12px', borderRadius: 7,
                                                    border: `1px solid ${copiedId === s.id ? C.green : C.gray}`,
                                                    background: copiedId === s.id ? C.gm : C.white,
                                                    color: copiedId === s.id ? C.gd : C.muted, cursor: 'pointer',
                                                }}>{copiedId === s.id ? 'Copied!' : 'Copy'}</button>
                                                <button onClick={() => openEdit(s)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.green}`, background: C.gm, color: C.gd, cursor: 'pointer' }}>Edit</button>
                                                <button onClick={() => deleteSnippet(s.id)} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 7, border: '1px solid #F87171', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer' }}>Delete</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}