'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'

const C = {
  white: '#FFFFFF', off: '#F8FAF8', gray: '#E8EBE8',
  muted: '#9CA39C', green: '#22C55E', gd: '#16A34A', greenDark: '#16A34A',
  gl: '#4ADE80', greenLight: '#4ADE80', gm: '#DCFCE7', greenMuted: '#DCFCE7',
  black: '#0A0A0A', text: '#171717', blackLight: '#171717', bm: '#262626', blackMedium: '#262626',
}

const SKILL_LEVELS = [
  { label: 'Beginner', max: 25,  color: C.muted },
  { label: 'Normal',   max: 50,  color: C.greenLight },
  { label: 'Pro',      max: 75,  color: C.green },
  { label: 'Expert',   max: 100, color: C.greenDark },
]

function getLevel(pct: number) {
  return SKILL_LEVELS.find(l => pct <= l.max) || SKILL_LEVELS[3]
}

const inp: any = {
  width: '100%', padding: '9px 12px', background: C.white,
  border: `1px solid ${C.gray}`, borderRadius: 8,
  color: C.blackLight, fontSize: 13, outline: 'none', fontFamily: 'inherit',
}
const lbl: any = {
  fontSize: 10, color: C.green, letterSpacing: '.08em',
  textTransform: 'uppercase', marginBottom: 5, display: 'block', fontWeight: 600,
}
const fw: any = { marginBottom: 14 }

// ======= EDIT DRAWER (ย้ายออกมานอก CvClient เพื่อแก้ cursor bug) =======
type EditDrawerProps = {
  editPanel: string | null
  setEditPanel: (v: string | null) => void
  fProfile: any; setFProfile: (v: any) => void
  fSkills: any[]; setFSkills: (v: any[]) => void
  fProjects: any[]; setFProjects: (v: any[]) => void
  fContact: any; setFContact: (v: any) => void
  avatarPreview: string
  saving: boolean
  onSave: () => void
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

function EditDrawer({
  editPanel, setEditPanel,
  fProfile, setFProfile,
  fSkills, setFSkills,
  fProjects, setFProjects,
  fContact, setFContact,
  avatarPreview, saving, onSave, onAvatarChange, fileInputRef,
}: EditDrawerProps) {
  if (!editPanel) return null
  return (
    <div onClick={() => setEditPanel(null)} style={{
      position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, border: `1px solid ${C.gray}`,
        borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 600,
        maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px 40px',
      }}>
        <div style={{ width: 36, height: 4, background: C.gray, borderRadius: 2, margin: '0 auto 20px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: C.blackLight }}>
            แก้ไข — <span style={{ color: C.green }}>{editPanel}</span>
          </p>
          <button onClick={() => setEditPanel(null)} style={{
            width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.gray}`,
            background: 'transparent', color: C.green, cursor: 'pointer', fontSize: 14,
          }}>✕</button>
        </div>

        {editPanel === 'profile' && (
          <div>
            <div style={fw}>
              <span style={lbl}>รูปประจำตัว</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', border: `2px solid ${C.green}`, background: C.greenMuted, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {avatarPreview
                    ? <img src={avatarPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: C.green, fontSize: 20, fontWeight: 500 }}>{fProfile.name?.split(' ').map((n: string) => n[0]).join('') || 'YN'}</span>
                  }
                </div>
                <div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarChange} style={{ display: 'none' }} />
                  <button onClick={() => fileInputRef.current?.click()} style={{ fontSize: 12, padding: '7px 16px', border: `1px solid ${C.green}`, borderRadius: 8, background: C.greenMuted, color: C.greenDark, cursor: 'pointer' }}>เลือกรูป</button>
                  <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>JPG, PNG ไม่เกิน 2MB</p>
                </div>
              </div>
            </div>
            {[
              { key: 'name', label: 'ชื่อ', ph: 'Your Name' },
              { key: 'role', label: 'Role / ตำแหน่ง', ph: 'Data Engineer' },
            ].map(f => (
              <div key={f.key} style={fw}>
                <label style={lbl}>{f.label}</label>
                <input style={inp} value={fProfile[f.key] || ''} placeholder={f.ph}
                  onChange={e => setFProfile({ ...fProfile, [f.key]: e.target.value })} />
              </div>
            ))}
            <div style={fw}>
              <label style={lbl}>Bio</label>
              <textarea style={{ ...inp, resize: 'vertical' }} rows={4}
                value={fProfile.bio || ''} placeholder="แนะนำตัวเอง..."
                onChange={e => setFProfile({ ...fProfile, bio: e.target.value })} />
            </div>
          </div>
        )}

        {editPanel === 'skills' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {SKILL_LEVELS.map(l => (
                <span key={l.label} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, border: `1px solid ${l.color}`, color: l.color }}>{l.label} (≤{l.max}%)</span>
              ))}
            </div>
            {fSkills.map((s: any, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <input style={{ ...inp, flex: 2 }} value={s.name} placeholder="ชื่อ skill"
                  onChange={e => { const n = [...fSkills]; n[i] = { ...n[i], name: e.target.value }; setFSkills(n) }} />
                <input type="number" min={1} max={100} style={{ ...inp, flex: 1 }} value={s.pct}
                  onChange={e => { const n = [...fSkills]; n[i] = { ...n[i], pct: Number(e.target.value) }; setFSkills(n) }} />
                <span style={{ fontSize: 11, color: getLevel(s.pct).color, minWidth: 52, fontWeight: 600 }}>{getLevel(s.pct).label}</span>
                <button onClick={() => setFSkills(fSkills.filter((_: any, j: number) => j !== i))} style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #DC2626', background: 'transparent', color: '#DC2626', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setFSkills([...fSkills, { name: '', pct: 50 }])} style={{ fontSize: 12, padding: '7px 16px', border: `1px dashed ${C.green}`, borderRadius: 8, background: 'transparent', color: C.green, cursor: 'pointer', marginTop: 4 }}>+ เพิ่ม skill</button>
          </div>
        )}

        {editPanel === 'projects' && (
          <div>
            {fProjects.map((p: any, i: number) => (
              <div key={i} style={{ background: C.off, border: `1px solid ${C.gray}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>Project {String(i + 1).padStart(2, '0')}</span>
                  <button onClick={() => setFProjects(fProjects.filter((_: any, j: number) => j !== i))} style={{ fontSize: 11, padding: '3px 10px', border: '1px solid #DC2626', borderRadius: 8, background: 'transparent', color: '#DC2626', cursor: 'pointer' }}>ลบ</button>
                </div>
                {[
                  { key: 'name',   label: 'ชื่อโปรเจกต์',              ph: 'My Project' },
                  { key: 'desc',   label: 'คำอธิบายสั้น',              ph: 'อธิบายสั้นๆ...' },
                  { key: 'detail', label: 'รายละเอียดเต็ม (ใน popup)', ph: 'อธิบายเพิ่มเติม...' },
                  { key: 'result', label: 'ผลลัพธ์',                   ph: 'ลดเวลา 80%...' },
                  { key: 'image',  label: 'URL รูปภาพ',                ph: 'https://...' },
                  { key: 'demo',   label: 'Link Demo',                 ph: 'https://...' },
                  { key: 'github', label: 'Link GitHub',               ph: 'https://github.com/...' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 10 }}>
                    <label style={lbl}>{f.label}</label>
                    {f.key === 'detail' || f.key === 'desc'
                      ? <textarea style={{ ...inp, resize: 'vertical' }} rows={2} value={p[f.key] || ''} placeholder={f.ph}
                          onChange={e => { const n = [...fProjects]; n[i] = { ...n[i], [f.key]: e.target.value }; setFProjects(n) }} />
                      : <input style={inp} value={p[f.key] || ''} placeholder={f.ph}
                          onChange={e => { const n = [...fProjects]; n[i] = { ...n[i], [f.key]: e.target.value }; setFProjects(n) }} />
                    }
                  </div>
                ))}
                <div>
                  <label style={lbl}>Tags (คั่นด้วย comma)</label>
                  <input style={inp} value={p.tags?.join(',') || ''} placeholder="n8n, Python, SQL"
                    onChange={e => { const n = [...fProjects]; n[i] = { ...n[i], tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) }; setFProjects(n) }} />
                </div>
              </div>
            ))}
            <button onClick={() => setFProjects([...fProjects, { num: String(fProjects.length + 1).padStart(2, '0'), name: '', desc: '', detail: '', result: '', tags: [], image: '', demo: '', github: '' }])} style={{ fontSize: 12, padding: '7px 16px', border: `1px dashed ${C.green}`, borderRadius: 8, background: 'transparent', color: C.green, cursor: 'pointer' }}>+ เพิ่มโปรเจกต์</button>
          </div>
        )}

        {editPanel === 'contact' && (
          <div>
            {[
              { key: 'email',    label: 'Email',    ph: 'you@email.com' },
              { key: 'phone',    label: 'Phone',    ph: '+66 XX XXX XXXX' },
              { key: 'linkedin', label: 'LinkedIn', ph: 'linkedin.com/in/yourname' },
            ].map(f => (
              <div key={f.key} style={fw}>
                <label style={lbl}>{f.label}</label>
                <input style={inp} value={fContact[f.key] || ''} placeholder={f.ph}
                  onChange={e => setFContact({ ...fContact, [f.key]: e.target.value })} />
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onSave} disabled={saving} style={{ padding: '10px 28px', background: C.green, border: 'none', borderRadius: 8, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save changes →'}</button>
          <button onClick={() => setEditPanel(null)} style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ======= MAIN COMPONENT =======
export default function CvClient() {
  const [profile, setProfile]   = useState<any>(null)
  const [skills, setSkills]     = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [contact, setContact]   = useState<any>(null)
  const [loaded, setLoaded]     = useState(false)  // แก้ flash bug
  const [slide, setSlide]       = useState(0)
  const [barsVisible, setBarsVisible] = useState(false)
  const [modal, setModal]       = useState<any>(null)
  const [user, setUser]         = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [editPanel, setEditPanel] = useState<string|null>(null)
  const [fProfile, setFProfile] = useState<any>({})
  const [fSkills, setFSkills]   = useState<any[]>([])
  const [fProjects, setFProjects] = useState<any[]>([])
  const [fContact, setFContact] = useState<any>({})
  const [saving, setSaving]     = useState(false)
  const [avatarFile, setAvatarFile] = useState<File|null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string>('')

  const skillsRef    = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase     = useMemo(() => createClient(), [])

  useEffect(() => {
    if (!supabase) return
    supabase.from('cv_sections').select('*').then(({ data }) => {
      const p  = data?.find(s => s.section === 'profile')?.content  || {}
      const sk = data?.find(s => s.section === 'skills')?.content   || []
      const pr = data?.find(s => s.section === 'projects')?.content || []
      const c  = data?.find(s => s.section === 'contact')?.content  || {}
      setProfile(p);  setFProfile(p)
      setSkills(sk);  setFSkills(sk)
      setProjects(pr); setFProjects(pr)
      setContact(c);  setFContact(c)
      if (p.avatar) setAvatarPreview(p.avatar)
      setLoaded(true)
    })
  }, [supabase])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [supabase])


  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setBarsVisible(true) }, { threshold: 0.3 })
    if (skillsRef.current) obs.observe(skillsRef.current)
    return () => obs.disconnect()
  }, [skills])

  useEffect(() => {
    document.body.style.overflow = (modal || editPanel) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modal, editPanel])

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    setUser(null); setEditMode(false)
    window.location.href = '/'
  }

  function openPanel(section: string) {
    if (section === 'profile')  setFProfile({ ...profile })
    if (section === 'skills')   setFSkills([...skills])
    if (section === 'projects') setFProjects([...projects])
    if (section === 'contact')  setFContact({ ...contact })
    setAvatarPreview(profile?.avatar || '')
    setAvatarFile(null)
    setEditPanel(section)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = ev => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function savePanel() {
    if (!editPanel) return
    setSaving(true)
    try {
      let newProfile = fProfile
      if (avatarFile && editPanel === 'profile' && supabase) {
        const ext  = avatarFile.name.split('.').pop()
        const path = `avatars/avatar.${ext}`
        await supabase.storage.from('cv-assets').upload(path, avatarFile, { upsert: true })
        const { data: urlData } = supabase.storage.from('cv-assets').getPublicUrl(path)
        newProfile = { ...fProfile, avatar: urlData.publicUrl }
        setFProfile(newProfile)
        setAvatarPreview(urlData.publicUrl)
      }
      if (supabase) {
        const contentMap: Record<string, any> = {
          profile: newProfile, skills: fSkills, projects: fProjects, contact: fContact,
        }
        await supabase.from('cv_sections')
          .update({ content: contentMap[editPanel], updated_at: new Date().toISOString() })
          .eq('section', editPanel)
      }
      if (editPanel === 'profile')  setProfile(newProfile)
      if (editPanel === 'skills')   setSkills(fSkills)
      if (editPanel === 'projects') setProjects(fProjects)
      if (editPanel === 'contact')  setContact(fContact)
      setEditPanel(null)
    } catch { alert('เกิดข้อผิดพลาด กรุณาลองใหม่') }
    setSaving(false)
  }



  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }



  // Loading skeleton
  if (!loaded) return (
    <div style={{ background: C.off, minHeight: '100vh' }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: `1px solid ${C.gray}`, background: C.white }}>
        <span style={{ color: C.green, fontWeight: 600, fontSize: 14 }}>Noar Personal Hub</span>
      </nav>
      <div style={{ padding: '48px 24px', background: C.white }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: C.gray, marginBottom: 16, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: 200, height: 24, background: C.gray, borderRadius: 6, marginBottom: 10, animation: 'shimmer 1.5s infinite' }} />
        <div style={{ width: 160, height: 16, background: C.gray, borderRadius: 6, animation: 'shimmer 1.5s infinite' }} />
      </div>
      <style>{`@keyframes shimmer{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  )

  return (
    <div style={{ background: C.off, minHeight: '100vh', color: C.blackLight }}>

      <EditDrawer
        editPanel={editPanel} setEditPanel={setEditPanel}
        fProfile={fProfile} setFProfile={setFProfile}
        fSkills={fSkills} setFSkills={setFSkills}
        fProjects={fProjects} setFProjects={setFProjects}
        fContact={fContact} setFContact={setFContact}
        avatarPreview={avatarPreview}
        saving={saving} onSave={savePanel}
        onAvatarChange={handleAvatarChange}
        fileInputRef={fileInputRef}
      />

      {/* Project modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.white, border: `1px solid ${C.gray}`, borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', padding: 28, position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <button onClick={() => setModal(null)} style={{ position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: '50%', border: `1px solid ${C.gray}`, background: 'transparent', color: C.green, cursor: 'pointer', fontSize: 14 }}>✕</button>
            <p style={{ fontSize: 10, color: C.green, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10, fontWeight: 600 }}>Project {modal.num}</p>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: C.blackLight, marginBottom: 8 }}>{modal.name}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
              {modal.tags?.map((t: string) => (<span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.greenMuted, color: C.greenDark, border: `1px solid ${C.green}` }}>{t}</span>))}
            </div>
            {modal.image && <div style={{ marginBottom: 18, borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.gray}` }}><img src={modal.image} alt={modal.name} style={{ width: '100%', display: 'block', maxHeight: 220, objectFit: 'cover' }} /></div>}
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, marginBottom: 16 }}>{modal.detail || modal.desc}</p>
            <div style={{ fontSize: 13, color: C.greenDark, padding: '10px 14px', background: C.greenMuted, borderLeft: `3px solid ${C.green}`, borderRadius: '0 8px 8px 0', marginBottom: 20 }}>{modal.result}</div>
            {(modal.demo || modal.github) && (
              <div style={{ display: 'flex', gap: 10 }}>
                {modal.demo && <a href={modal.demo} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '7px 18px', border: `1px solid ${C.green}`, borderRadius: 8, color: C.white, textDecoration: 'none', background: C.green }}>Live demo →</a>}
                {modal.github && <a href={modal.github} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '7px 18px', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, textDecoration: 'none' }}>GitHub →</a>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- NAVBAR ---- */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: `1px solid ${C.gray}`, background: C.white, position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>NPH</div>
        </a>
        <div style={{ display: 'flex', gap: 3, background: C.off, padding: '3px', borderRadius: 10, border: `1px solid ${C.gray}` }}>
          <a href="/cv" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: C.green, color: '#fff', textDecoration: 'none', fontWeight: 500 }}>CV</a>
          <a href="/dashboard" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Logs</a>
          <a href="/tasks" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Tasks</a>
          <a href="/snippets" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Snippets</a>
          <a href="/workspace" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>Workspace</a>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {!user ? (
            <a href="/login" style={{ fontSize: 11, padding: '5px 14px', border: `1px solid ${C.green}`, borderRadius: 7, color: C.green, textDecoration: 'none', fontWeight: 500 }}>log in</a>
          ) : (
            <>
              <span style={{ fontSize: 12, color: C.muted, marginRight: 8 }}>{user?.email}</span>
              <button onClick={() => setEditMode(e => !e)} style={{ fontSize: 11, padding: '5px 14px', border: `1px solid ${editMode ? C.green : C.gray}`, borderRadius: 7, background: editMode ? C.greenMuted : 'transparent', color: C.green, cursor: 'pointer', fontWeight: 500 }}>{editMode ? '✓ Edit mode' : '✎ Edit'}</button>
              <button onClick={handleLogout} style={{ fontSize: 11, padding: '5px 14px', border: `1px solid ${C.gray}`, borderRadius: 7, background: 'transparent', color: C.muted, cursor: 'pointer' }}>log out</button>
            </>
          )}
        </div>
      </nav>

      {/* CV CONTENT */}
      <section style={{ padding: '48px 24px 36px', background: C.white }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                <div style={{ width: 68, height: 68, borderRadius: '50%', border: `2px solid ${C.green}`, background: C.greenMuted, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {profile?.avatar
                    ? <img src={profile.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ color: C.green, fontSize: 20, fontWeight: 600 }}>{profile?.name?.split(' ').map((n: string) => n[0]).join('') || 'YN'}</span>
                  }
                </div>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 600, color: C.blackLight }}>{profile?.name || 'Your Name'}</h1>
                  <p style={{ color: C.green, fontSize: 13, marginTop: 4, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{profile?.role || ''}</p>
                  <p style={{ color: C.muted, fontSize: 13, marginTop: 12, lineHeight: 1.75, maxWidth: 400 }}>{profile?.bio || ''}</p>
                </div>
              </div>
              {editMode && <button onClick={() => openPanel('profile')} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenMuted, color: C.greenDark, cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: 16, fontWeight: 500 }}>✎ แก้ไข</button>}
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${C.gray}` }} />

          <section style={{ padding: '28px 24px', background: C.white }} ref={skillsRef}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.green, letterSpacing: '.1em', textTransform: 'uppercase' }}>Skills</p>
              {editMode && <button onClick={() => openPanel('skills')} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenMuted, color: C.greenDark, cursor: 'pointer', fontWeight: 500 }}>✎ แก้ไข</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {skills.map((s: any) => {
                const lv = getLevel(s.pct)
                return (
                  <div key={s.name} style={{ background: C.off, borderRadius: 12, padding: 16, border: `1px solid ${C.gray}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.blackLight }}>{s.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: C.blackLight }}>{s.pct}%</span>
                        <span style={{ fontSize: 10, color: C.white, padding: '3px 8px', borderRadius: 4, background: lv.color, fontWeight: 600, textTransform: 'uppercase' }}>{lv.label}</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: C.gray, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: lv.color, width: barsVisible ? `${s.pct}%` : '0%', transition: 'width .8s cubic-bezier(.4,0,.2,1)' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${C.gray}` }} />

          <section style={{ padding: '28px 24px', background: C.white }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.green, letterSpacing: '.1em', textTransform: 'uppercase' }}>Key projects</p>
              {editMode && <button onClick={() => openPanel('projects')} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenMuted, color: C.greenDark, cursor: 'pointer', fontWeight: 500 }}>✎ แก้ไข</button>}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', transform: `translateX(-${slide * 100}%)`, transition: 'transform .4s cubic-bezier(.4,0,.2,1)' }}>
                {projects.map((p: any) => (
                  <div key={p.num} style={{ minWidth: '100%' }}>
                    <div onClick={() => setModal(p)} style={{ padding: 20, background: C.off, border: `1px solid ${C.gray}`, borderRadius: 12, cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.green)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = C.gray)}
                    >
                      <p style={{ fontSize: 11, color: C.green, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 600 }}>Project {p.num} / 0{projects.length}</p>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: C.blackLight, marginBottom: 8 }}>{p.name}</h3>
                      <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>{p.desc}</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                        {p.tags?.map((t: string) => (<span key={t} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: C.greenMuted, color: C.greenDark, border: `1px solid ${C.green}` }}>{t}</span>))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ fontSize: 12, color: C.greenDark, padding: '8px 12px', background: C.greenMuted, borderLeft: `3px solid ${C.green}`, borderRadius: '0 8px 8px 0', flex: 1 }}>{p.result}</p>
                        <span style={{ fontSize: 11, color: C.green, marginLeft: 12, fontWeight: 500 }}>See More →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {projects.map((_: any, i: number) => (
                  <div key={i} onClick={() => setSlide(i)} style={{ height: 6, borderRadius: 3, cursor: 'pointer', width: i === slide ? 18 : 6, background: i === slide ? C.green : C.gray, transition: 'all .2s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['←', '→'].map((arrow, idx) => (
                  <button key={arrow} onClick={() => setSlide(s => idx === 0 ? Math.max(0, s - 1) : Math.min(projects.length - 1, s + 1))} disabled={idx === 0 ? slide === 0 : slide === projects.length - 1} style={{ width: 30, height: 30, borderRadius: '50%', border: `1px solid ${C.green}`, background: 'transparent', color: C.green, cursor: 'pointer', fontSize: 14, opacity: (idx === 0 ? slide === 0 : slide === projects.length - 1) ? 0.25 : 1 }}>{arrow}</button>
                ))}
              </div>
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: `1px solid ${C.gray}` }} />

          <section style={{ padding: '28px 24px 48px', background: C.white }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.green, letterSpacing: '.1em', textTransform: 'uppercase' }}>Contact</p>
              {editMode && <button onClick={() => openPanel('contact')} style={{ fontSize: 11, padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.greenMuted, color: C.greenDark, cursor: 'pointer', fontWeight: 500 }}>✎ แก้ไข</button>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { icon: '✉',  label: 'Email',    val: contact?.email    || '' },
                { icon: '📞', label: 'Phone',    val: contact?.phone    || '' },
                { icon: 'in', label: 'LinkedIn', val: contact?.linkedin || '' },
              ].map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: C.off, borderRadius: 12, border: `1px solid ${C.gray}` }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.greenMuted, border: `1px solid ${C.green}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: C.green, fontWeight: 600 }}>{c.icon}</div>
                  <div>
                    <p style={{ fontSize: 11, color: C.green, letterSpacing: '.04em', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{c.label}</p>
                    <p style={{ fontSize: 13, color: C.blackLight, fontWeight: 500 }}>{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>


      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  )
}
