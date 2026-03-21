'use client'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'

const C = {
    white: '#FFFFFF', off: '#F8FAF8', gray: '#E8EBE8',
    muted: '#9CA39C', green: '#22C55E', gd: '#16A34A',
    gm: '#DCFCE7', black: '#0A0A0A', text: '#171717',
}

const WORK_TAGS = ['Sales', 'Marketing', 'Development', 'Design', 'Operations', 'Finance']
const SKILL_TAGS = ['Python', 'SQL', 'Next.js', 'n8n', 'Presentation', 'Data Analysis', 'Automation']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}
function getFirstDay(year: number, month: number) {
    return new Date(year, month, 1).getDay()
}

type Task = {
    id: string; title: string; description: string
    start_date: string; end_date: string
    skill_tags: string[]; work_tags: string[]; status: string
}
type Schedule = {
    id: string; title: string; date: string
    start_time: string; end_time: string
    source: string; work_tag: string
}

export default function TasksClient() {
    const today = new Date()
    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())
    const [selectedDate, setSelectedDate] = useState(today.toISOString().slice(0, 10))
    const [tasks, setTasks] = useState<Task[]>([])
    const [schedules, setSchedules] = useState<Schedule[]>([])
    const [user, setUser] = useState<any>(null)
    const [showTaskForm, setShowTaskForm] = useState(false)
    const [showSchedForm, setShowSchedForm] = useState(false)
    const [expandedTask, setExpandedTask] = useState<string | null>(null)
    const [googleConnected, setGoogleConnected] = useState(false)

    // Task form state
    const [tf, setTf] = useState({
        title: '', description: '', start_date: '', end_date: '',
        skill_tags: [] as string[], work_tags: [] as string[]
    })
    // Schedule form state
    const [sf, setSf] = useState({
        title: '', date: selectedDate, start_time: '', end_time: '', work_tag: ''
    })

    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => setUser(data.user))
    }, [supabase])

    useEffect(() => {
        if (!user) return
        fetch('/api/tasks').then(r => r.json()).then(setTasks)
    }, [user])

    useEffect(() => {
        if (!user) return
        fetch(`/api/schedules?date=${selectedDate}`)
            .then(r => r.json()).then(setSchedules)
    }, [user, selectedDate])

    async function addTask() {
        if (!tf.title || !tf.start_date || !tf.end_date) return
        const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tf)
        })
        const task = await res.json()
        setTasks(prev => [...prev, task])
        setTf({ title: '', description: '', start_date: '', end_date: '', skill_tags: [], work_tags: [] })
        setShowTaskForm(false)
    }

    async function finishTask(id: string) {
        await fetch('/api/tasks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'finished' })
        })
        setTasks(prev => prev.filter(t => t.id !== id))
    }

    async function addSchedule() {
        if (!sf.title || !sf.date) return
        const res = await fetch('/api/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sf)
        })
        const sched = await res.json()
        if (sched.date === selectedDate) setSchedules(prev => [...prev, sched])
        setSf({ title: '', date: selectedDate, start_time: '', end_time: '', work_tag: '' })
        setShowSchedForm(false)
    }

    async function pushToGoogleCal(sched: Schedule) {
        const tokens = await fetch('/api/google/tokens').then(r => r.json())
        if (!tokens?.access_token) {
            window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!)}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&prompt=consent`
            return
        }
        const start = new Date(`${sched.date}T${sched.start_time || '09:00'}:00`)
        const end = new Date(`${sched.date}T${sched.end_time || '10:00'}:00`)
        await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                summary: sched.title,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            })
        })
        alert('เพิ่มเข้า Google Calendar แล้วครับ!')
    }

    // ---- Calendar helpers ----
    const daysInMonth = getDaysInMonth(year, month)
    const firstDay = getFirstDay(year, month)
    const prevDays = getDaysInMonth(year, month - 1)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

    // วันไหนมี task หรือ schedule
    const taskDates = new Set(tasks.flatMap(t => {
        const dates: string[] = []
        let d = new Date(t.start_date)
        const end = new Date(t.end_date)
        while (d <= end) {
            dates.push(d.toISOString().slice(0, 10))
            d.setDate(d.getDate() + 1)
        }
        return dates
    }))

    // Timeline: task ใน month ปัจจุบัน
    const daysInM = getDaysInMonth(year, month)
    function taskToTimeline(t: Task) {
        const start = new Date(t.start_date)
        const end = new Date(t.end_date)
        const mStart = new Date(year, month, 1)
        const mEnd = new Date(year, month, daysInM)
        const s = Math.max(0, (start < mStart ? 0 : start.getDate() - 1))
        const e = Math.min(daysInM, (end > mEnd ? daysInM : end.getDate()))
        const left = (s / daysInM) * 100
        const width = Math.max(3, ((e - s) / daysInM) * 100)
        return { left, width }
    }

    function getDaysLeft(end: string) {
        const diff = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000)
        return diff > 0 ? `${diff} days left` : 'Overdue'
    }
    function getProgress(start: string, end: string) {
        const total = new Date(end).getTime() - new Date(start).getTime()
        const passed = Date.now() - new Date(start).getTime()
        return Math.min(100, Math.max(0, Math.round((passed / total) * 100)))
    }

    const inp: any = {
        width: '100%', padding: '8px 12px', background: C.white,
        border: `1px solid ${C.gray}`, borderRadius: 8,
        color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit'
    }
    const lbl: any = {
        fontSize: 10, color: C.green, fontWeight: 600,
        letterSpacing: '.07em', textTransform: 'uppercase',
        display: 'block', marginBottom: 4
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

            {/* ---- MODALS ---- */}
            {(showTaskForm || showSchedForm) && (
                <div onClick={() => { setShowTaskForm(false); setShowSchedForm(false) }}
                    style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '24px 24px 40px' }}>
                        <div style={{ width: 32, height: 4, background: C.gray, borderRadius: 2, margin: '0 auto 18px' }} />
                        <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 18 }}>
                            {showTaskForm ? 'Add Task' : 'Add Schedule'}
                        </p>

                        {showTaskForm && (
                            <div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>ชื่องาน</label>
                                    <input style={inp} value={tf.title} placeholder="ชื่องาน..." onChange={e => setTf({ ...tf, title: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div>
                                        <label style={lbl}>วันเริ่ม</label>
                                        <input type="date" style={inp} value={tf.start_date} onChange={e => setTf({ ...tf, start_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={lbl}>วันสิ้นสุด</label>
                                        <input type="date" style={inp} value={tf.end_date} onChange={e => setTf({ ...tf, end_date: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>เนื้อหางาน</label>
                                    <textarea style={{ ...inp, resize: 'vertical' }} rows={3} value={tf.description} placeholder="รายละเอียด..." onChange={e => setTf({ ...tf, description: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>Skill Tags</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {SKILL_TAGS.map(tag => (
                                            <button key={tag} onClick={() => setTf(f => ({
                                                ...f, skill_tags: f.skill_tags.includes(tag)
                                                    ? f.skill_tags.filter(t => t !== tag)
                                                    : [...f.skill_tags, tag]
                                            }))} style={{
                                                fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                                border: tf.skill_tags.includes(tag) ? '1px solid #818CF8' : `1px solid ${C.gray}`,
                                                background: tf.skill_tags.includes(tag) ? '#EEF2FF' : C.white,
                                                color: tf.skill_tags.includes(tag) ? '#4338CA' : C.muted
                                            }}>{tag}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={lbl}>Work Tags</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {WORK_TAGS.map(tag => (
                                            <button key={tag} onClick={() => setTf(f => ({
                                                ...f, work_tags: f.work_tags.includes(tag)
                                                    ? f.work_tags.filter(t => t !== tag)
                                                    : [...f.work_tags, tag]
                                            }))} style={{
                                                fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                                border: tf.work_tags.includes(tag) ? '1px solid #FB923C' : `1px solid ${C.gray}`,
                                                background: tf.work_tags.includes(tag) ? '#FFF7ED' : C.white,
                                                color: tf.work_tags.includes(tag) ? '#C2410C' : C.muted
                                            }}>{tag}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={addTask} style={{ padding: '9px 24px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save Task →</button>
                                    <button onClick={() => setShowTaskForm(false)} style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {showSchedForm && (
                            <div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>ชื่อนัด</label>
                                    <input style={inp} value={sf.title} placeholder="Meeting, Call..." onChange={e => setSf({ ...sf, title: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: 12 }}>
                                    <label style={lbl}>วันที่</label>
                                    <input type="date" style={inp} value={sf.date} onChange={e => setSf({ ...sf, date: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                    <div>
                                        <label style={lbl}>เวลาเริ่ม</label>
                                        <input type="time" style={inp} value={sf.start_time} onChange={e => setSf({ ...sf, start_time: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={lbl}>เวลาสิ้นสุด</label>
                                        <input type="time" style={inp} value={sf.end_time} onChange={e => setSf({ ...sf, end_time: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={lbl}>Work Tag</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                        {WORK_TAGS.map(tag => (
                                            <button key={tag} onClick={() => setSf(f => ({ ...f, work_tag: f.work_tag === tag ? '' : tag }))} style={{
                                                fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                                                border: sf.work_tag === tag ? `1px solid ${C.green}` : `1px solid ${C.gray}`,
                                                background: sf.work_tag === tag ? C.gm : C.white,
                                                color: sf.work_tag === tag ? C.gd : C.muted
                                            }}>{tag}</button>
                                        ))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={addSchedule} style={{ padding: '9px 24px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Save Schedule →</button>
                                    <button onClick={() => setShowSchedForm(false)} style={{ padding: '9px 16px', background: 'transparent', border: `1px solid ${C.gray}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                                </div>
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
          <a href="/cv" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>CV</a>
          <a href="/dashboard" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>Logs</a>
          <a href="/tasks" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'C.green', color: '#fff', textDecoration: 'none', fontWeight: 500 }}>Tasks</a>
          <a href="/snippets" style={{ padding: '5px 14px', borderRadius: 7, fontSize: 11, background: 'transparent', color: 'C.muted', textDecoration: 'none', fontWeight: 500 }}>Snippets</a>
        </div>
                <span style={{ fontSize: 12, color: C.muted }}>{user?.email}</span>
            </nav>

            <div style={{ padding: '16px', maxWidth: 1100, margin: '0 auto' }}>

                {/* ---- CALENDAR CARD ---- */}
                <div style={{ background: C.white, border: `0.5px solid ${C.gray}`, borderRadius: 12, marginBottom: 12 }}>
                    <div style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{monthNames[month]} {year}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.gray}`, background: C.white, color: C.muted, cursor: 'pointer', fontSize: 13 }}>←</button>
                                    <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }} style={{ width: 26, height: 26, borderRadius: '50%', border: `1px solid ${C.gray}`, background: C.white, color: C.muted, cursor: 'pointer', fontSize: 13 }}>→</button>
                                </div>
                                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EBF5FB', color: '#1A73E8', border: '0.5px solid #4285F4' }}>Google Calendar</span>
                            </div>
                        </div>

                        {/* Day labels */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
                            {DAYS.map(d => <div key={d} style={{ fontSize: 10, color: C.muted, textAlign: 'center', padding: '3px 0', fontWeight: 600, letterSpacing: '.05em' }}>{d}</div>)}
                        </div>

                        {/* Days grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
                            {Array.from({ length: firstDay }, (_, i) => (
                                <div key={`prev-${i}`} style={{ height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#D1D5DB' }}>
                                    {prevDays - firstDay + i + 1}
                                </div>
                            ))}
                            {Array.from({ length: daysInMonth }, (_, i) => {
                                const d = i + 1
                                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                                const isToday = dateStr === today.toISOString().slice(0, 10)
                                const isSel = dateStr === selectedDate
                                const hasTask = taskDates.has(dateStr)
                                return (
                                    <div key={d} onClick={() => setSelectedDate(dateStr)}
                                        style={{
                                            height: 34, borderRadius: 7, display: 'flex', flexDirection: 'column',
                                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                            fontSize: 12, position: 'relative',
                                            background: isToday ? C.green : isSel ? C.gm : 'transparent',
                                            color: isToday ? '#fff' : isSel ? C.gd : C.text,
                                            fontWeight: (isToday || isSel) ? 600 : 400,
                                            border: isSel && !isToday ? `2px solid ${C.green}` : 'none',
                                        }}>
                                        {d}
                                        {hasTask && <div style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#fff' : C.green, position: 'absolute', bottom: 3 }} />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Timeline */}
                    {tasks.length > 0 && (
                        <div style={{ padding: '0 20px 16px', borderTop: `1px solid ${C.gray}`, paddingTop: 14 }}>
                            <p style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Task Timeline — {monthNames[month]}</p>
                            {tasks.map(t => {
                                const { left, width } = taskToTimeline(t)
                                return (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, height: 22 }}>
                                        <span style={{ fontSize: 11, color: C.muted, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                                        <div style={{ flex: 1, height: 22, background: C.off, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                                            <div style={{ position: 'absolute', left: `${left}%`, width: `${width}%`, height: '100%', background: C.green, borderRadius: 4, display: 'flex', alignItems: 'center', padding: '0 6px', fontSize: 10, color: '#fff', fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                {t.title}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Action bar */}
                    <div style={{ borderTop: `1px solid ${C.gray}`, padding: '12px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button onClick={() => { setShowTaskForm(true); setShowSchedForm(false) }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: C.green, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>+ Add Task</button>
                        <button onClick={() => { setShowSchedForm(true); setSf(f => ({ ...f, date: selectedDate })); setShowTaskForm(false) }} style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.green}`, background: C.white, color: C.green, cursor: 'pointer', fontWeight: 500 }}>+ Add Schedule</button>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: C.muted }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }}></span>Task</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4285F4', display: 'inline-block' }}></span>Google Cal</span>
                        </div>
                    </div>
                </div>

                {/* ---- COLUMNS ---- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

                    {/* Schedule column */}
                    <div style={{ background: C.white, border: `0.5px solid ${C.gray}`, borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, letterSpacing: '.06em', textTransform: 'uppercase' }}>Schedule</span>
                            <span style={{ fontSize: 11, color: C.muted }}>
                                {new Date(selectedDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                            </span>
                        </div>
                        {schedules.length === 0 && (
                            <p style={{ padding: '20px 16px', fontSize: 13, color: C.muted, textAlign: 'center' }}>ไม่มีนัดในวันนี้</p>
                        )}
                        {schedules.map(s => (
                            <div key={s.id} style={{ padding: '10px 16px', borderBottom: `0.5px solid #F1F5F9`, display: 'flex', gap: 10 }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.source === 'google' ? '#4285F4' : C.green, marginTop: 5, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{s.title}</div>
                                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                                        {s.start_time && s.end_time ? `${s.start_time} — ${s.end_time}` : 'ทั้งวัน'}
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                                        {s.work_tag && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: C.gm, color: C.gd, border: `0.5px solid ${C.green}` }}>{s.work_tag}</span>}
                                        {s.source === 'manual' && (
                                            <button onClick={() => pushToGoogleCal(s)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EBF5FB', color: '#1A73E8', border: '0.5px solid #4285F4', cursor: 'pointer' }}>
                                                → Google Cal
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div style={{ padding: '10px 16px' }}>
                            <button onClick={() => { setShowSchedForm(true); setSf(f => ({ ...f, date: selectedDate })) }} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.gray}`, borderRadius: 8, background: 'transparent', color: C.muted, fontSize: 12, cursor: 'pointer' }}>+ Add to this day</button>
                        </div>
                    </div>

                    {/* Tasks column */}
                    <div style={{ background: C.white, border: `0.5px solid ${C.gray}`, borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${C.gray}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.green, letterSpacing: '.06em', textTransform: 'uppercase' }}>Open Tasks</span>
                            <span style={{ fontSize: 10, background: C.gm, color: C.gd, padding: '2px 8px', borderRadius: 20 }}>{tasks.length} pending</span>
                        </div>
                        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {tasks.length === 0 && <p style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>ไม่มีงานค้างอยู่ 🎉</p>}
                            {tasks.map(t => (
                                <div key={t.id} onClick={() => setExpandedTask(expandedTask === t.id ? null : t.id)}
                                    style={{ background: C.off, border: `1px solid ${expandedTask === t.id ? C.green : C.gray}`, borderRadius: 10, padding: 12, cursor: 'pointer', transition: 'border-color .15s' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.title}</div>
                                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t.start_date} — {t.end_date} · {getDaysLeft(t.end_date)}</div>
                                        </div>
                                        <span style={{ fontSize: 16, color: C.gray, transform: expandedTask === t.id ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>›</span>
                                    </div>
                                    <div style={{ height: 4, background: C.gray, borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: C.green, borderRadius: 2, width: `${getProgress(t.start_date, t.end_date)}%` }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: expandedTask === t.id ? 10 : 0 }}>
                                        {t.skill_tags?.map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#EEF2FF', color: '#4338CA', border: '0.5px solid #818CF8' }}>{tag}</span>)}
                                        {t.work_tags?.map(tag => <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#FFF7ED', color: '#C2410C', border: '0.5px solid #FB923C' }}>{tag}</span>)}
                                    </div>
                                    {expandedTask === t.id && (
                                        <div onClick={e => e.stopPropagation()}>
                                            <div style={{ borderTop: `1px solid ${C.gray}`, paddingTop: 10, marginBottom: 10 }}>
                                                <p style={{ fontSize: 10, color: C.green, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 4 }}>Description</p>
                                                <p style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{t.description || 'ไม่มีรายละเอียด'}</p>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                <button onClick={() => finishTask(t.id)} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 8, border: 'none', background: C.black, color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Finish</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        </div>
    )
}