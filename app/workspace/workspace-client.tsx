'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
    addEdge, Background, Controls, MiniMap,
    useNodesState, useEdgesState,
    Node, Edge, Connection, NodeTypes,
    Handle, Position, NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { createClient } from '@/lib/supabase'

const C = {
    white: '#FFFFFF', off: '#F8FAF8', gray: '#E8EBE8',
    muted: '#9CA39C', green: '#22C55E', gd: '#16A34A',
    gm: '#DCFCE7', black: '#0A0A0A', text: '#171717',
}

const DEPT_TAGS = ['Marketing', 'Sales', 'Development', 'Design', 'Operations', 'Finance', 'HR']
const WORK_TAGS = ['Planning', 'Research', 'Execution', 'Review', 'Launch', 'Archive']
const BLOCK_COLORS = [
    { label: 'Green', bg: '#DCFCE7', border: '#22C55E', text: '#16A34A' },
    { label: 'Blue', bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
    { label: 'Orange', bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
    { label: 'Purple', bg: '#F5F3FF', border: '#8B5CF6', text: '#6D28D9' },
    { label: 'Black', bg: '#F1F5F9', border: '#0A0A0A', text: '#0A0A0A' },
]

type Workspace = {
    id: string; title: string
    dept_tags: string[]; work_tags: string[]
    canvas_data: { nodes: Node[]; edges: Edge[] }
    updated_at: string
}

// ---- Custom Nodes ----
function NoteNode({ data, selected }: NodeProps) {
    return (
        <div style={{
            background: '#fff', border: `1.5px solid ${selected ? data.color || C.green : data.color || C.green}`,
            borderRadius: 10, padding: 12, minWidth: 160, maxWidth: 260,
            boxShadow: selected ? `0 0 0 2px ${data.color || C.green}33` : 'none',
        }}>
            <Handle type="target" position={Position.Left} style={{ background: data.color || C.green, width: 8, height: 8 }} />
            <div style={{ fontSize: 10, fontWeight: 600, color: data.color || C.green, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 5 }}>
                {data.label || 'Note'}
            </div>
            <div style={{ fontSize: 12, color: '#555', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {data.body || 'Click to edit...'}
            </div>
            <Handle type="source" position={Position.Right} style={{ background: data.color || C.green, width: 8, height: 8 }} />
        </div>
    )
}

function BlockNode({ data, selected }: NodeProps) {
    const col = BLOCK_COLORS.find(c => c.label === data.colorLabel) || BLOCK_COLORS[0]
    return (
        <div style={{
            background: col.bg, border: `2px solid ${selected ? col.border : col.border}`,
            borderRadius: 8, padding: '10px 16px', textAlign: 'center', minWidth: 120,
            boxShadow: selected ? `0 0 0 2px ${col.border}33` : 'none',
        }}>
            <Handle type="target" position={Position.Left} style={{ background: col.border, width: 8, height: 8 }} />
            <Handle type="target" position={Position.Top} style={{ background: col.border, width: 8, height: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: col.text }}>{data.label || 'Block'}</div>
            {data.sub && <div style={{ fontSize: 10, color: col.text, opacity: 0.7, marginTop: 2 }}>{data.sub}</div>}
            <Handle type="source" position={Position.Right} style={{ background: col.border, width: 8, height: 8 }} />
            <Handle type="source" position={Position.Bottom} style={{ background: col.border, width: 8, height: 8 }} />
        </div>
    )
}

function ImageNode({ data }: NodeProps) {
    return (
        <div style={{ border: `1.5px solid ${C.gray}`, borderRadius: 10, overflow: 'hidden', background: '#fff', minWidth: 120 }}>
            <Handle type="target" position={Position.Left} style={{ background: C.muted, width: 8, height: 8 }} />
            {data.url ? (
                <img src={data.url} alt={data.label} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
            ) : (
                <div style={{ background: C.gm, width: 150, height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontSize: 24, color: C.green }}>+</span>
                    <span style={{ fontSize: 10, color: C.muted }}>Image</span>
                </div>
            )}
            {data.label && <div style={{ padding: '4px 8px', fontSize: 11, color: C.muted }}>{data.label}</div>}
            <Handle type="source" position={Position.Right} style={{ background: C.muted, width: 8, height: 8 }} />
        </div>
    )
}

const nodeTypes: NodeTypes = { note: NoteNode, block: BlockNode, image: ImageNode }

let nodeIdCounter = 1

export default function WorkspaceClient() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [user, setUser] = useState<any>(null)
    const [loaded, setLoaded] = useState(false)
    const [nodes, setNodes, onNodesChange] = useNodesState([])
    const [edges, setEdges, onEdgesChange] = useEdgesState([])
    const [saving, setSaving] = useState(false)
    const [showNewForm, setShowNewForm] = useState(false)
    const [showEditNode, setShowEditNode] = useState<Node | null>(null)
    const [tool, setTool] = useState<'note' | 'block' | 'image'>('note')
    const [blockColor, setBlockColor] = useState('Green')

    // New workspace form
    const [wForm, setWForm] = useState({ title: '', dept_tags: [] as string[], work_tags: [] as string[] })
    // Edit node form
    const [nForm, setNForm] = useState({ label: '', body: '', sub: '', colorLabel: 'Green', url: '' })

    const supabase = useMemo(() => createClient(), [])
    const fileRef = useRef<HTMLInputElement>(null)
    const rfRef = useRef<any>(null)

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase])

    useEffect(() => {
        if (!user) return
        fetch('/api/workspaces').then(r => r.json()).then(data => {
            if (Array.isArray(data)) {
                setWorkspaces(data)
                if (data.length > 0) openWorkspace(data[0])
            }
            setLoaded(true)
        })
    }, [user])

    function openWorkspace(ws: Workspace) {
        setActiveId(ws.id)
        const cd = ws.canvas_data || { nodes: [], edges: [] }
        setNodes(cd.nodes || [])
        setEdges(cd.edges || [])
    }

    async function createWorkspace() {
        if (!wForm.title) return
        const res = await fetch('/api/workspaces', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wForm)
        })
        const ws = await res.json()
        setWorkspaces(prev => [ws, ...prev])
        openWorkspace(ws)
        setShowNewForm(false)
        setWForm({ title: '', dept_tags: [], work_tags: [] })
    }

    async function saveCanvas() {
        if (!activeId) return
        setSaving(true)
        await fetch('/api/workspaces', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeId, canvas_data: { nodes, edges } })
        })
        setWorkspaces(prev => prev.map(w =>
            w.id === activeId ? { ...w, canvas_data: { nodes, edges }, updated_at: new Date().toISOString() } : w
        ))
        setSaving(false)
    }

    async function deleteWorkspace(id: string) {
        if (!confirm('ลบ workspace นี้?')) return
        await fetch('/api/workspaces', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        })
        setWorkspaces(prev => {
            const rest = prev.filter(w => w.id !== id)
            if (activeId === id) {
                if (rest.length > 0) openWorkspace(rest[0])
                else { setActiveId(null); setNodes([]); setEdges([]) }
            }
            return rest
        })
    }

    const onConnect = useCallback(
        (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: C.green } }, eds)),
        [setEdges]
    )

    function addNode(type: 'note' | 'block' | 'image') {
        const id = `node-${Date.now()}-${nodeIdCounter++}`
        const center = { x: 200 + Math.random() * 200, y: 100 + Math.random() * 150 }
        const newNode: Node = {
            id, type,
            position: center,
            data: type === 'note'
                ? { label: 'New Note', body: 'พิมพ์ note ที่นี่...', color: C.green }
                : type === 'block'
                    ? { label: 'Block', sub: 'subtitle', colorLabel: blockColor }
                    : { label: 'Image', url: '' }
        }
        setNodes(nds => [...nds, newNode])
    }

    function onNodeDoubleClick(_: any, node: Node) {
        setShowEditNode(node)
        setNForm({
            label: node.data.label || '',
            body: node.data.body || '',
            sub: node.data.sub || '',
            colorLabel: node.data.colorLabel || 'Green',
            url: node.data.url || '',
        })
    }

    function saveNodeEdit() {
        if (!showEditNode) return
        setNodes(nds => nds.map(n => n.id === showEditNode.id
            ? { ...n, data: { ...n.data, ...nForm, color: n.type === 'note' ? C.green : n.data.color } }
            : n
        ))
        setShowEditNode(null)
    }

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        const ext = file.name.split('.').pop()
        const path = `workspace/${Date.now()}.${ext}`
        await supabase.storage.from('cv-assets').upload(path, file, { upsert: true })
        const { data } = supabase.storage.from('cv-assets').getPublicUrl(path)
        const id = `node-img-${Date.now()}`
        setNodes(nds => [...nds, {
            id, type: 'image',
            position: { x: 200 + Math.random() * 150, y: 100 + Math.random() * 100 },
            data: { label: file.name, url: data.publicUrl }
        }])
    }

    const activeWs = workspaces.find(w => w.id === activeId)

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

    if (!user) return (
        <div style={{ background: C.off, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <a href="/login" style={{ fontSize: 13, padding: '8px 20px', background: C.green, color: '#fff', borderRadius: 8, textDecoration: 'none' }}>Log in →</a>
        </div>
    )

    return (
        <div style={{ background: C.off, height: '100vh', display: 'flex', flexDirection: 'column', color: C.text, overflow: 'hidden' }}>

            {/* Edit Node Modal */}
            {showEditNode && (
                <div onClick={() => setShowEditNode(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 400, padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Edit {showEditNode.type}</p>
                            <button onClick={() => setShowEditNode(null)} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.gray}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>Title / Label</label>
                            <input style={inp} value={nForm.label} onChange={e => setNForm(f => ({ ...f, label: e.target.value }))} />
                        </div>
                        {showEditNode.type === 'note' && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={lbl}>Content</label>
                                <textarea style={{ ...inp, resize: 'vertical' }} rows={4} value={nForm.body} onChange={e => setNForm(f => ({ ...f, body: e.target.value }))} />
                            </div>
                        )}
                        {showEditNode.type === 'block' && (
                            <>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>Subtitle</label>
                                    <input style={inp} value={nForm.sub} onChange={e => setNForm(f => ({ ...f, sub: e.target.value }))} />
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label style={lbl}>Color</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {BLOCK_COLORS.map(c => (
                                            <button key={c.label} onClick={() => setNForm(f => ({ ...f, colorLabel: c.label }))} style={{
                                                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                                                background: c.bg, border: `2px solid ${nForm.colorLabel === c.label ? c.border : C.gray}`,
                                            }} title={c.label} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        {showEditNode.type === 'image' && (
                            <div style={{ marginBottom: 12 }}>
                                <label style={lbl}>Image URL</label>
                                <input style={inp} value={nForm.url} placeholder="https://..." onChange={e => setNForm(f => ({ ...f, url: e.target.value }))} />
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={saveNodeEdit} style={{ padding: '8px 20px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save</button>
                            <button onClick={() => {
                                setNodes(nds => nds.filter(n => n.id !== showEditNode.id))
                                setShowEditNode(null)
                            }} style={{ padding: '8px 16px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 8, color: '#DC2626', cursor: 'pointer', fontSize: 13 }}>Delete node</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Workspace Modal */}
            {showNewForm && (
                <div onClick={() => setShowNewForm(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 14, width: '100%', maxWidth: 440, padding: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                            <p style={{ fontSize: 14, fontWeight: 600 }}>New Workspace</p>
                            <button onClick={() => setShowNewForm(false)} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.gray}`, background: 'transparent', cursor: 'pointer', fontSize: 14, color: C.muted }}>✕</button>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>ชื่อ Workspace</label>
                            <input style={inp} value={wForm.title} placeholder="ชื่อโปรเจกต์..." onChange={e => setWForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label style={lbl}>แผนก (Dept Tags)</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {DEPT_TAGS.map(tag => (
                                    <button key={tag} onClick={() => setWForm(f => ({
                                        ...f, dept_tags: f.dept_tags.includes(tag)
                                            ? f.dept_tags.filter(t => t !== tag)
                                            : [...f.dept_tags, tag]
                                    }))} style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                        border: wForm.dept_tags.includes(tag) ? '1px solid #818CF8' : `1px solid ${C.gray}`,
                                        background: wForm.dept_tags.includes(tag) ? '#EEF2FF' : C.white,
                                        color: wForm.dept_tags.includes(tag) ? '#4338CA' : C.muted,
                                    }}>{tag}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                            <label style={lbl}>Work Tags</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {WORK_TAGS.map(tag => (
                                    <button key={tag} onClick={() => setWForm(f => ({
                                        ...f, work_tags: f.work_tags.includes(tag)
                                            ? f.work_tags.filter(t => t !== tag)
                                            : [...f.work_tags, tag]
                                    }))} style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                        border: wForm.work_tags.includes(tag) ? `1px solid ${C.green}` : `1px solid ${C.gray}`,
                                        background: wForm.work_tags.includes(tag) ? C.gm : C.white,
                                        color: wForm.work_tags.includes(tag) ? C.gd : C.muted,
                                    }}>{tag}</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={createWorkspace} style={{ padding: '9px 24px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Create →</button>
                            <button onClick={() => setShowNewForm(false)} style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* NAVBAR */}
            <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${C.gray}`, background: C.white, flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>NPH</div>
                <div style={{ display: 'flex', gap: 3, background: C.off, padding: '3px', borderRadius: 10, border: `1px solid ${C.gray}` }}>
                    {[{ label: 'CV', href: '/' }, { label: 'Logs', href: '/dashboard' }, { label: 'Tasks', href: '/tasks' }, { label: 'Snippets', href: '/snippets' }, { label: 'Workspace', href: '/workspace' }].map(tab => (
                        <a key={tab.label} href={tab.href} style={{
                            padding: '5px 11px', borderRadius: 7, fontSize: 11,
                            background: tab.label === 'Workspace' ? C.green : 'transparent',
                            color: tab.label === 'Workspace' ? '#fff' : C.muted,
                            textDecoration: 'none', fontWeight: 500,
                        }}>{tab.label}</a>
                    ))}
                </div>
                <span style={{ fontSize: 12, color: C.muted }}>{user?.email}</span>
            </nav>

            {/* MAIN LAYOUT */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                {/* Sidebar */}
                <div style={{ width: 220, background: C.white, borderRight: `0.5px solid ${C.gray}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.green, letterSpacing: '.06em', textTransform: 'uppercase' }}>Workspaces</span>
                        <button onClick={() => setShowNewForm(true)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ New</button>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {!loaded && <p style={{ padding: 16, fontSize: 12, color: C.muted }}>Loading...</p>}
                        {loaded && workspaces.length === 0 && (
                            <div style={{ padding: 16, textAlign: 'center' }}>
                                <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>ยังไม่มี workspace</p>
                                <button onClick={() => setShowNewForm(true)} style={{ fontSize: 12, padding: '6px 14px', border: 'none', background: C.green, color: '#fff', borderRadius: 8, cursor: 'pointer' }}>สร้างอันแรก</button>
                            </div>
                        )}
                        {workspaces.map(ws => (
                            <div key={ws.id} onClick={() => openWorkspace(ws)} style={{
                                padding: '10px 12px', borderBottom: `0.5px solid #F1F5F9`, cursor: 'pointer',
                                background: activeId === ws.id ? C.gm : 'transparent',
                                borderLeft: activeId === ws.id ? `2px solid ${C.green}` : '2px solid transparent',
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: C.text, marginBottom: 2 }}>{ws.title}</div>
                                <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>
                                    {new Date(ws.updated_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {ws.dept_tags?.map(t => <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#EEF2FF', color: '#4338CA', border: '0.5px solid #818CF8' }}>{t}</span>)}
                                    {ws.work_tags?.map(t => <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: C.gm, color: C.gd, border: `0.5px solid ${C.green}` }}>{t}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Canvas area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                    {/* Canvas toolbar */}
                    {activeId && (
                        <div style={{ background: C.white, borderBottom: `0.5px solid ${C.gray}`, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, marginRight: 4 }}>{activeWs?.title}</span>
                            <div style={{ width: 1, height: 18, background: C.gray, margin: '0 4px' }} />

                            {/* Tool buttons */}
                            {[
                                { key: 'note', label: 'Note', icon: '✎' },
                                { key: 'block', label: 'Block', icon: '⬜' },
                                { key: 'image', label: 'Image', icon: '🖼' },
                            ].map(t => (
                                <button key={t.key} onClick={() => { setTool(t.key as any); addNode(t.key as any) }} style={{
                                    fontSize: 11, padding: '5px 10px', borderRadius: 7,
                                    border: `1px solid ${C.gray}`, background: C.white,
                                    color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                                }}>
                                    <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
                                </button>
                            ))}

                            {/* Image upload */}
                            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                            <button onClick={() => fileRef.current?.click()} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 7, border: `1px solid ${C.gray}`, background: C.white, color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ fontSize: 12 }}>↑</span> Upload
                            </button>

                            <div style={{ width: 1, height: 18, background: C.gray, margin: '0 4px' }} />

                            {/* Block color */}
                            <span style={{ fontSize: 10, color: C.muted }}>Block color:</span>
                            {BLOCK_COLORS.map(c => (
                                <button key={c.label} onClick={() => setBlockColor(c.label)} title={c.label} style={{
                                    width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
                                    background: c.bg, border: `2px solid ${blockColor === c.label ? c.border : C.gray}`,
                                }} />
                            ))}

                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                <span style={{ fontSize: 11, color: C.muted, alignSelf: 'center' }}>Double-click node to edit</span>
                                <button onClick={saveCanvas} disabled={saving} style={{
                                    fontSize: 12, padding: '6px 16px', borderRadius: 8,
                                    border: 'none', background: C.green, color: '#fff',
                                    cursor: 'pointer', fontWeight: 500, opacity: saving ? 0.7 : 1,
                                }}>{saving ? 'Saving...' : 'Save'}</button>
                            </div>
                        </div>
                    )}

                    {/* React Flow Canvas */}
                    {activeId ? (
                        <div style={{ flex: 1 }}>
                            <ReactFlow
                                ref={rfRef}
                                nodes={nodes}
                                edges={edges}
                                onNodesChange={onNodesChange}
                                onEdgesChange={onEdgesChange}
                                onConnect={onConnect}
                                onNodeDoubleClick={onNodeDoubleClick}
                                nodeTypes={nodeTypes}
                                fitView
                                deleteKeyCode="Delete"
                                style={{ background: C.off }}
                            >
                                <Background color="#D1D5DB" gap={20} size={1} />
                                <Controls style={{ background: C.white, border: `1px solid ${C.gray}` }} />
                                <MiniMap style={{ background: C.white, border: `1px solid ${C.gray}` }} nodeColor={n => n.type === 'block' ? C.green : C.muted} />
                            </ReactFlow>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.off }}>
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>เลือกหรือสร้าง Workspace ก่อนครับ</p>
                                <button onClick={() => setShowNewForm(true)} style={{ fontSize: 13, padding: '9px 20px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ New Workspace</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}