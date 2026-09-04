import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, Check, ChevronDown,
  CircleHelp, ClipboardCheck, CloudDownload, FileDown, FileText, FolderOpen,
  Gauge, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, Sun, Target, Upload, Users, X, Zap, LogIn, LogOut, LockKeyhole
} from 'lucide-react'
import './styles.css'

const seedPrograms = [
  { id: 1, kode: 'PRG-001', nama: 'Peningkatan Jalan Lingkungan', bidang: 'Infrastruktur', target: 12, realisasi: 9, pagu: 1850000000, status: 'Berjalan', penanggung: 'PPTK Infrastruktur', deadline: '2026-10-14' },
  { id: 2, kode: 'PRG-002', nama: 'Pelayanan Administrasi Terpadu', bidang: 'Pelayanan Publik', target: 100, realisasi: 82, pagu: 640000000, status: 'Berjalan', penanggung: 'Kasi Pemerintahan', deadline: '2026-11-20' },
  { id: 3, kode: 'PRG-003', nama: 'Pemberdayaan UMKM Desa', bidang: 'Ekonomi', target: 8, realisasi: 8, pagu: 920000000, status: 'Selesai', penanggung: 'Kasi Ekonomi', deadline: '2026-09-30' },
  { id: 4, kode: 'PRG-004', nama: 'Pencegahan Stunting Terpadu', bidang: 'Kesehatan', target: 6, realisasi: 3, pagu: 770000000, status: 'Perlu perhatian', penanggung: 'Kasi Kesra', deadline: '2026-09-18' },
]
const seedDocs = [
  { id: 1, name: 'Rencana Kerja Kecamatan 2026.pdf', type: 'Perencanaan', size: '2.4 MB', date: '02 Sep 2026', status: 'Terverifikasi' },
  { id: 2, name: 'Laporan Realisasi Triwulan II.xlsx', type: 'Pelaporan', size: '1.1 MB', date: '28 Agu 2026', status: 'Menunggu verifikasi' },
  { id: 3, name: 'BA Evaluasi Kinerja Semester I.pdf', type: 'Evaluasi', size: '845 KB', date: '21 Agu 2026', status: 'Terverifikasi' },
]
const seedEvents = [
  { date: '2026-09-08', title: 'Rapat pengendalian bulanan', type: 'Rapat' },
  { date: '2026-09-12', title: 'Batas unggah laporan PPTK', type: 'Deadline' },
  { date: '2026-09-18', title: 'Monitoring Stunting Terpadu', type: 'Monitoring' },
  { date: '2026-09-25', title: 'Forum evaluasi kinerja', type: 'Evaluasi' },
]
const seedUsers = [
  { id: 1, username: 'user', password: 'user123', name: 'Pengguna SIPERAN', role: 'User' },
  { id: 2, username: 'admin', password: 'admin123', name: 'Admin', role: 'Admin' },
  { id: 3, username: 'superadmin', password: 'superadmin123', name: 'Super Admin', role: 'Super Admin' },
]
const defaultAdminContacts = [
 { id: 1, type: 'whatsapp', value: '085771076965' },
 { id: 2, type: 'email', value: 'admin.siperan@kedungwaringin.go.id' },
]

const navGroups = [
  { title: 'Utama', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Siklus Kinerja', items: [
    { id: 'perencanaan', label: 'Perencanaan', icon: Target },
    { id: 'pengendalian', label: 'Pengendalian & Realisasi', icon: Activity },
    { id: 'evaluasi', label: 'Evaluasi & Pelaporan', icon: BarChart3 },
  ]},
  { title: 'Layanan', items: [
    { id: 'unduhan', label: 'Pusat Unduhan', icon: CloudDownload },
    { id: 'pengaturan', label: 'Pengaturan & Bantuan', icon: Settings2 },
  ]},
]

const api = (url, options = {}) => fetch(`/api${url}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Permintaan gagal'); return r.status === 204 ? null : r.json() })
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const pct = (a, b) => Math.round((a / b) * 100)
const formatDate = date => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
const greetingFor = hour => hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [authLog, setAuthLog] = useState([])
  const [adminContacts, setAdminContacts] = useState(defaultAdminContacts)
  const [active, setActive] = useState('dashboard')
  const [programs, setPrograms] = useState([])
  const [docs, setDocs] = useState([])
  const [events, setEvents] = useState([])
  const [role, setRole] = useState('User')
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState('')
  const [sidebar, setSidebar] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('siperan-theme')
    return saved || (new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'dark' : 'light')
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('siperan-theme', theme)
  }, [theme])
  useEffect(() => {
    api('/auth/me').then(u => { if (u) { setCurrentUser(u); setRole(u.role) } }).catch(() => {})
  }, [])
  useEffect(() => {
    if (!currentUser) return
    Promise.all([api('/programs'), api('/docs'), api('/events'), api('/log'), api('/users'), api('/admin-contacts')]).then(([p,d,e,l,u,c]) => { setPrograms(p); setDocs(d); setEvents(e); setAuthLog(l); setUsers(u); setAdminContacts(c.length ? c : defaultAdminContacts) }).catch(() => notify('Gagal memuat data server'))
  }, [currentUser])

  const filtered = programs.filter(p => `${p.nama} ${p.bidang} ${p.kode}`.toLowerCase().includes(query.toLowerCase()))
  const totalPagu = programs.reduce((s, p) => s + p.pagu, 0)
  const totalRealisasi = programs.reduce((s, p) => s + p.realisasi, 0)
  const overall = Math.round(programs.reduce((s, p) => s + pct(p.realisasi, p.target), 0) / programs.length)
  const notifications = useMemo(() => {
    const items = []
    programs.filter(p => p.status === 'Perlu perhatian' || p.realisasi < p.target * 0.6).forEach(p => items.push({ id: `program-${p.id}`, title: `Program butuh tindak lanjut`, detail: `${p.nama} · realisasi ${p.realisasi}% dari target ${p.target}%`, action: 'Lihat pengendalian', href: 'pengendalian' }))
    docs.filter(d => d.status === 'Menunggu verifikasi').forEach(d => items.push({ id: `doc-${d.id}`, title: 'Dokumen menunggu verifikasi', detail: `${d.name} · ${d.type}`, action: 'Review dokumen', href: 'evaluasi' }))
    if (!items.length) {
      items.push({ id: 'ok', title: 'Semua kegiatan terkendali', detail: 'Tidak ada tugas yang perlu ditindaklanjuti saat ini.', action: 'Lihat dashboard', href: 'dashboard' })
    }
    return items
  }, [programs, docs])
  const notificationCount = notifications.filter(item => item.id !== 'ok').length
  const notify = msg => { setToast(msg); setTimeout(() => setToast(''), 2800) }

  function signIn(user) {
    setCurrentUser(user); setRole(user.role)
  }
  function signOut() {
    if (!currentUser) return
    api('/auth/logout', { method: 'POST' }).finally(() => setCurrentUser(null))
  }

  if (!currentUser) return <Login users={users} onLogin={signIn} />

  function addProgram(e) {
    if (!canWrite) return
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    api('/programs', { method:'POST', body: JSON.stringify({ nama:f.get('nama'), bidang:f.get('bidang'), target:Number(f.get('target')), pagu:Number(f.get('pagu')), penanggung:f.get('penanggung'), deadline:f.get('deadline') }) }).then(p => { setPrograms([...programs,p]); setModal(null); notify('Program baru berhasil ditambahkan') }).catch(e => notify(e.message))
  }
  function addDoc(e) {
    if (!canWrite) return
    e.preventDefault()
    const f = new FormData(e.currentTarget); const file = f.get('file')
    if (!file?.name) return
    api('/docs', { method:'POST', body: JSON.stringify({ name:file.name, type:f.get('type'), size:`${Math.max(1, Math.round(file.size / 1024))} KB` }) }).then(d => { setDocs([d,...docs]); setModal(null); notify('Dokumen berhasil diunggah dan menunggu verifikasi') }).catch(e => notify(e.message))
  }
  function verifyDoc(id) {
    if (!canWrite) return
    api(`/docs/${id}`, { method:'PATCH', body:JSON.stringify({status:'Terverifikasi'}) }).then(() => { setDocs(docs.map(d => d.id === id ? {...d,status:'Terverifikasi'} : d)); notify('Dokumen ditandai terverifikasi') })
  }
  const canWrite = currentUser.role !== 'User'
  function removeProgram(id) {
    if (!canWrite) return
    api(`/programs/${id}`, {method:'DELETE'}).then(() => { setPrograms(programs.filter(program => program.id !== id)); notify('Program berhasil dihapus') })
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">S</div><div><b>SIPERAN</b><small>KEDUNGWARINGIN</small></div><button className="close-nav" onClick={() => setSidebar(false)}><X size={18}/></button></div>
      <div className="office"><span className="online-dot"/> Kecamatan Kedungwaringin <ChevronDown size={14}/></div>
      <nav>{navGroups.map(g => <div className="nav-group" key={g.title}><label>{g.title}</label>{g.items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); setSidebar(false) }}><Icon size={18}/><span>{label}</span>{id === 'pengendalian' && <em>4</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><div><b>Butuh bantuan?</b><small>Silakan hubungi Admin SIPERAN Kedungwaringin</small>{(() => { const wa = adminContacts.find(c => c.type === 'whatsapp')?.value || '085771076965'; const waLink = `https://wa.me/${wa.replace(/\D/g, '').replace(/^0/, '62')}`; return <><a className="help-link" href={waLink} target="_blank" rel="noreferrer">Hubungi Admin</a>{currentUser.role === 'Super Admin' && <button type="button" className="help-link" onClick={() => setActive('pengaturan')}>Edit Nomor HP & Email</button>}</> })()}</div></div><div className="user-mini"><div className="avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div><button className="logout-btn" title="Keluar" onClick={signOut}><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="hamburger" onClick={() => setSidebar(true)}><Menu size={21}/></button><div className="breadcrumbs"><span>SIPERAN</span><b>/</b><strong>{navGroups.flatMap(g => g.items).find(i => i.id === active)?.label}</strong></div><div className="top-actions"><div className="role-select"><ShieldCheck size={16}/><span>{currentUser.role}</span></div><button className="theme-switch" onClick={() => setTheme(curr => curr === 'light' ? 'dark' : 'light')} aria-label="Ganti tema"><span className="theme-icon">{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}</span><span>{theme === 'light' ? 'Mode gelap' : 'Mode terang'}</span></button><div className="notification-wrap"><button className="icon-btn notification" onClick={() => setNotificationsOpen(v => !v)} aria-label="Lihat notifikasi"><Bell size={19}/>{notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-head"><b>Notifikasi</b><span>{notificationCount} perlu tindak lanjut</span></div>{notifications.map(item => <div className="notification-item" key={item.id}><div className="notification-copy"><b>{item.title}</b><small>{item.detail}</small></div><button className="secondary xs" onClick={() => { setActive(item.href); setNotificationsOpen(false) }}>{item.action}</button></div>)}</div>}</div><div className="top-avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div></div></header>
      <div className="content">
        {active === 'dashboard' && <Dashboard programs={programs} docs={docs} events={events} overall={overall} totalPagu={totalPagu} totalRealisasi={totalRealisasi} onNavigate={setActive} />}
        {active === 'perencanaan' && <Planning programs={filtered} query={query} setQuery={setQuery} onAdd={() => setModal('program')} onDelete={removeProgram} canWrite={canWrite} onNavigate={setActive} />}
        {active === 'pengendalian' && <Control programs={programs} setPrograms={setPrograms} onUpload={() => setModal('doc')} canWrite={canWrite} notify={notify} />}
        {active === 'evaluasi' && <Evaluation programs={programs} docs={docs} onUpload={() => setModal('doc')} onVerify={verifyDoc} canWrite={canWrite} />}
        {active === 'unduhan' && <Downloads docs={docs} onUpload={() => setModal('doc')} canWrite={canWrite} />}
        {active === 'pengaturan' && <Settings notify={notify} currentUser={currentUser} users={users} authLog={authLog} adminContacts={adminContacts} setAdminContacts={setAdminContacts} />}
      </div>
    </main>
    {modal === 'program' && canWrite && <Modal title="Tambah program kerja" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addProgram}><label>Nama program<input required name="nama" placeholder="Contoh: Rehabilitasi drainase"/></label><label>Bidang<select name="bidang"><option>Infrastruktur</option><option>Pelayanan Publik</option><option>Ekonomi</option><option>Kesehatan</option></select></label><label>Target indikator<input required name="target" type="number" min="1" /></label><label>Pagu anggaran<input required name="pagu" type="number" min="0" /></label><label>Penanggung jawab<input required name="penanggung" placeholder="Nama jabatan/tim"/></label><label>Batas waktu<input required name="deadline" type="date"/></label><button className="primary full" type="submit"><Plus size={17}/> Simpan program</button></form></Modal>}
    {modal === 'doc' && canWrite && <Modal title="Unggah dokumen" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addDoc}><label>Jenis dokumen<select name="type"><option>Perencanaan</option><option>Pelaporan</option><option>Evaluasi</option><option>Lainnya</option></select></label><label className="upload-field">Pilih berkas<input required name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><p className="muted">Format PDF, Excel, atau Word. Maksimal 10 MB.</p><button className="primary full" type="submit"><Upload size={17}/> Unggah dokumen</button></form></Modal>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function Login({ users, onLogin }) {
  const [error, setError] = useState('')
  function submit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    api('/auth/login', { method:'POST', body:JSON.stringify({username:form.get('username'), password:form.get('password')}) })
      .then(onLogin).catch(() => setError('Username atau password tidak sesuai.'))
  }
  return <main className="login-page"><section className="login-card"><div className="login-brand"><div className="brand-mark">S</div><div><b>SIPERAN</b><small>KEDUNGWARINGIN</small></div></div><div className="login-heading"><span className="eyebrow">Sistem Perencanaan dan Pelaporan Terpadu</span><h1>Selamat Datang</h1><p>Masuk untuk mengelola kinerja Kecamatan Kedungwaringin.</p></div><form className="login-form" onSubmit={submit}><label>Username<input name="username" required autoComplete="username" placeholder="Masukkan username" /></label><label>Password<input name="password" required type="password" autoComplete="current-password" placeholder="Masukkan password" /></label>{error && <p className="login-error">{error}</p>}<button className="primary full" type="submit"><LogIn size={17}/> Masuk ke aplikasi</button></form><div className="login-hint"><LockKeyhole size={15}/><span>Akun demo: <b>user/user123</b>, <b>admin/admin123</b>, <b>superadmin/superadmin123</b></span></div></section></main>
}

function PageTitle({ eyebrow, title, children }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="title-actions">{children}</div></div> }
function Button({ children, onClick, secondary = false }) { return <button onClick={onClick} className={secondary ? 'secondary' : 'primary'}>{children}</button> }
function Stat({ label, value, note, icon: Icon, tone = 'green' }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }

function Dashboard({ programs, docs, events, overall, totalPagu, totalRealisasi, onNavigate }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const monthEvents = events.filter(e => e.date.startsWith('2026-09'))
  return <><PageTitle eyebrow={`Ringkasan kinerja · ${formatDate(now)}`} title={greetingFor(now.getHours())}><p className="subtitle">Pantau perencanaan dan kinerja Kecamatan Kedungwaringin dalam satu tempat.</p></PageTitle>
    <div className="stat-grid"><Stat label="Realisasi anggaran" value={rupiah(totalRealisasi * 10000000)} note="▲ 8,4% dari bulan lalu" icon={Gauge}/><Stat label="Progress kinerja" value={`${overall}%`} note="Dari 4 program aktif" icon={Target} tone="blue"/><Stat label="Program berjalan" value={programs.filter(p => p.status === 'Berjalan').length} note="2 perlu perhatian" icon={Activity} tone="orange"/><Stat label="Dokumen masuk" value={docs.length} note="1 menunggu verifikasi" icon={FolderOpen} tone="purple"/></div>
    <div className="dashboard-grid"><section className="card performance-card"><div className="card-head"><div><h2>Ikhtisar kinerja program</h2><p>Perbandingan target dan realisasi tahun anggaran 2026</p></div><button className="link-btn" onClick={() => onNavigate('pengendalian')}>Lihat detail <span>→</span></button></div><div className="chart"><div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="bars">{programs.map(p => <div className="bar-group" key={p.id}><div className="bar-wrap"><div className="bar target" style={{height: `${Math.min(100, pct(p.target, p.target))}%`}}/><div className="bar actual" style={{height: `${Math.min(100, pct(p.realisasi, p.target))}%`}}/></div><span>{p.kode}</span></div>)}</div><div className="legend"><span><i className="legend-target"/>Target</span><span><i className="legend-actual"/>Realisasi</span></div></div></section><section className="card warning-card"><div className="card-head"><div><h2>Early warning</h2><p>Perlu ditindaklanjuti minggu ini</p></div><AlertTriangle className="warning-icon" size={21}/></div><div className="warnings">{programs.filter(p => p.status === 'Perlu perhatian').map(p => <div className="warning-item" key={p.id}><div className="warning-dot"/><div><b>{p.nama}</b><small>Realisasi {pct(p.realisasi, p.target)}% · Batas {new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</small></div><button onClick={() => onNavigate('pengendalian')}>Tindak</button></div>)}<div className="warning-item info"><div className="warning-dot blue"/><div><b>1 dokumen menunggu verifikasi</b><small>Laporan Realisasi Triwulan II.xlsx</small></div><button onClick={() => onNavigate('evaluasi')}>Review</button></div></div></section></div>
    <div className="dashboard-grid lower"><section className="card"><div className="card-head"><div><h2>Agenda terdekat</h2><p>Jadwal kegiatan dan tenggat pelaporan</p></div><CalendarDays size={20} className="muted-icon"/></div><div className="agenda">{monthEvents.map(e => <div className="agenda-row" key={e.date}><div className="date-box"><b>{new Date(e.date).getDate()}</b><small>SEP</small></div><div><b>{e.title}</b><small>{e.type} · Kecamatan Kedungwaringin</small></div><span className={`tag ${e.type === 'Deadline' ? 'orange' : ''}`}>{e.type}</span></div>)}</div></section><section className="card activity-card"><div className="card-head"><div><h2>Aktivitas terbaru</h2><p>Jejak perubahan terakhir di sistem</p></div><button className="link-btn" onClick={() => onNavigate('unduhan')}>Semua aktivitas →</button></div><div className="timeline"><ActivityItem icon={Upload} title="Laporan Realisasi Triwulan II.xlsx" text="diunggah oleh Admin" time="2 jam lalu"/><ActivityItem icon={ClipboardCheck} title="PRG-003 ditandai selesai" text="oleh Camat/Sekcam" time="Kemarin"/><ActivityItem icon={FileText} title="Rencana Kerja Kecamatan 2026.pdf" text="terverifikasi" time="2 hari lalu"/></div></section></div>
  </>
}
function ActivityItem({ icon: Icon, title, text, time }) { return <div className="timeline-row"><div className="timeline-icon"><Icon size={16}/></div><div><b>{title}</b><small>{text}</small></div><time>{time}</time></div> }

function Planning({ programs, query, setQuery, onAdd, onDelete, canWrite, onNavigate }) { return <><PageTitle eyebrow="Siklus kinerja · Tahun Anggaran 2026" title="Perencanaan">{canWrite && <Button onClick={onAdd}><Plus size={17}/> Tambah program</Button>}</PageTitle><div className="callout"><div className="callout-icon"><Zap size={19}/></div><div><b>Rencana kerja tahun 2026 sedang berjalan</b><p>Lengkapi indikator dan pagu untuk menjaga konsistensi antara rencana dan realisasi.</p></div><button onClick={() => onNavigate('pengendalian')}>Buka pengendalian →</button></div><section className="card table-card"><div className="table-toolbar"><div><h2>Daftar program kerja</h2><p>{programs.length} program terdaftar</p></div><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari program..." /></div></div><ProgramTable programs={programs} canWrite={canWrite} onDelete={onDelete}/></section></> }
function ProgramTable({ programs, canWrite, onDelete }) { return <div className="table-scroll"><table><thead><tr><th>Kode / Program</th><th>Bidang</th><th>Pagu anggaran</th><th>Progress</th><th>Status</th><th>Penanggung jawab</th>{canWrite && <th>Aksi</th>}</tr></thead><tbody>{programs.map(p => <tr key={p.id}><td><b>{p.kode}</b><span>{p.nama}</span></td><td>{p.bidang}</td><td>{rupiah(p.pagu)}</td><td><div className="progress-cell"><div className="progress"><i style={{width: `${Math.min(100, pct(p.realisasi, p.target))}%`}}/></div><small>{pct(p.realisasi, p.target)}%</small></div></td><td><span className={`status ${p.status === 'Selesai' ? 'done' : p.status === 'Perlu perhatian' ? 'warn' : ''}`}>{p.status}</span></td><td>{p.penanggung}</td>{canWrite && <td><button className="table-action danger" onClick={() => onDelete(p.id)}>Hapus</button></td>}</tr>)}</tbody></table></div> }

function Control({ programs, setPrograms, onUpload, canWrite, notify }) { const [selected, setSelected] = useState(programs[0]?.id); const current = programs.find(p => p.id === selected) || programs[0]; const currentPercent = current && current.target ? Math.min(100, Math.round((current.realisasi / current.target) * 100)) : 0; const updatePercent = (nextPercent) => { if (!canWrite || !current) return; const nextRealisasi = Math.round((nextPercent / 100) * current.target); const nextStatus = nextRealisasi >= current.target ? 'Selesai' : nextPercent >= 75 ? 'Berjalan' : 'Perlu perhatian'; const n = { ...current, realisasi: nextRealisasi, status: nextStatus }; api(`/programs/${current.id}`,{method:'PATCH',body:JSON.stringify(n)}).then(() => { setPrograms(programs.map(p => p.id === current.id ? n : p)); notify(`Realisasi diatur menjadi ${nextPercent}%`) }) }; return <><PageTitle eyebrow="Siklus kinerja · Monitoring berkala" title="Pengendalian & Realisasi">{canWrite && <Button secondary onClick={onUpload}><Upload size={17}/> Unggah bukti realisasi</Button>}</PageTitle><div className="control-layout"><section className="card program-list"><div className="card-head"><div><h2>Pilih program</h2><p>Perbarui capaian fisik secara berkala</p></div></div>{programs.map(p => <button key={p.id} className={`program-option ${selected === p.id ? 'selected' : ''}`} onClick={() => setSelected(p.id)}><div><b>{p.kode}</b><span>{p.nama}</span></div><strong>{pct(p.realisasi, p.target)}%</strong></button>)}</section><section className="card detail-card">{current && <><div className="detail-top"><div><span className="eyebrow">{current.kode} · {current.bidang}</span><h2>{current.nama}</h2><p>Penanggung jawab: {current.penanggung}</p></div><span className={`status ${current.status === 'Perlu perhatian' ? 'warn' : current.status === 'Selesai' ? 'done' : ''}`}>{current.status}</span></div><div className="big-progress"><div className="big-progress-head"><span>Realisasi indikator</span><b>{pct(current.realisasi, current.target)}%</b></div><div className="progress"><i style={{width: `${pct(current.realisasi, current.target)}%`}}/></div><div className="metric-row"><div><small>Realisasi</small><b>{current.realisasi} <em>/ {current.target} target</em></b></div><div><small>Pagu</small><b>{rupiah(current.pagu)}</b></div><div><small>Batas waktu</small><b>{new Date(current.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</b></div></div></div><div className="update-box"><h3>Input realisasi terbaru</h3><p>{canWrite ? 'Pilih tingkat capaian dari 10% sampai 100% untuk melihat progres secara jelas.' : 'Mode baca saja: Anda tidak memiliki izin mengubah realisasi.'}</p>{canWrite && <><div className="step-grid">{[0,10,20,30,40,50,60,70,80,90,100].map(step => <button key={step} className={`step-btn ${currentPercent === step ? 'active' : ''}`} onClick={() => updatePercent(step)}>{step}%</button>)}</div><div className="slider-wrap"><label>Capaian saat ini: <strong>{currentPercent}%</strong></label><input type="range" min="0" max="100" step="10" value={currentPercent} onChange={e => updatePercent(Number(e.target.value))} /></div><div className="quick-actions"><button className="secondary" onClick={() => notify('Bukti realisasi siap diunggah')}>Lampirkan bukti</button></div></>}</div></>}</section></div></> }

function Evaluation({ programs, docs, onUpload, onVerify, canWrite }) { return <><PageTitle eyebrow="Siklus kinerja · Akuntabilitas" title="Evaluasi & Pelaporan">{canWrite && <Button onClick={onUpload}><Upload size={17}/> Unggah laporan</Button>}</PageTitle><div className="eval-stats"><div className="card eval-score"><span className="eyebrow">Nilai kinerja sementara</span><strong>82,6</strong><span className="score-up">▲ 4,2 poin dari semester lalu</span><div className="score-track"><i style={{width:'82.6%'}}/></div><small>Baik · Berdasarkan 4 program dan 12 indikator</small></div><div className="card"><div className="card-head"><div><h2>Kepatuhan pelaporan</h2><p>Status dokumen tahun berjalan</p></div><ClipboardCheck className="muted-icon"/></div><div className="compliance"><div><b>75%</b><span>Tepat waktu</span></div><div><b>2/3</b><span>Terverifikasi</span></div><div><b>0</b><span>Ditolak</span></div></div></div></div><section className="card table-card"><div className="card-head"><div><h2>Dokumen pelaporan</h2><p>Kelola dokumen dan status verifikasi</p></div><FileText className="muted-icon"/></div><div className="table-scroll"><table><thead><tr><th>Nama dokumen</th><th>Jenis</th><th>Ukuran</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{docs.map(d => <tr key={d.id}><td><div className="file-name"><div className="file-icon"><FileText size={16}/></div><b>{d.name}</b></div></td><td>{d.type}</td><td>{d.size}</td><td>{d.date}</td><td><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span></td><td>{canWrite && d.status !== 'Terverifikasi' && <button className="table-action" onClick={() => onVerify(d.id)}><Check size={15}/> Verifikasi</button>}</td></tr>)}</tbody></table></div></section></> }

function makePdfDownload(name, lines) {
  const esc = value => String(value).replace(/[\\()]/g, '\\$&')
  const content = `BT /F1 12 Tf 50 760 Td ${lines.map(line => `(${esc(line)}) Tj 0 -18 Td`).join('')} ET`
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`]
  let pdf = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object, index) => { offsets[index + 1] = pdf.length; pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${name.replace(/\.[^.]+$/, '')}.pdf`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Downloads({ docs, onUpload, canWrite }) { const download = d => makePdfDownload(d.name, ['SIPERAN KEDUNGWARINGIN', `Dokumen: ${d.name}`, `Jenis: ${d.type}`, `Status: ${d.status}`, `Tanggal: ${d.date}`]); const downloadTemplate = () => makePdfDownload('Template-Laporan-SIPERAN', ['SIPERAN KEDUNGWARINGIN', 'TEMPLATE LAPORAN REALISASI', '', 'Program Kegiatan:', 'Pagu Anggaran:', 'Realisasi Keuangan:', 'Realisasi Fisik:', 'Catatan:']); return <><PageTitle eyebrow="Pusat dokumen" title="Pusat Unduhan">{canWrite && <Button onClick={onUpload}><Upload size={17}/> Tambah dokumen</Button>}</PageTitle><div className="download-banner"><div className="download-art"><CloudDownload size={32}/></div><div><h2>Semua dokumen kerja, terorganisir</h2><p>Unduh template dan berkas pelaporan Kecamatan Kedungwaringin dalam format PDF.</p></div><Button secondary onClick={downloadTemplate}>Unduh template PDF</Button></div><section className="card table-card"><div className="table-toolbar"><div><h2>Dokumen tersedia</h2><p>Semua unduhan dikonversi otomatis ke PDF</p></div><div className="search"><Search size={17}/><input placeholder="Cari dokumen..." /></div></div><div className="download-list">{docs.map(d => <div className="download-row" key={d.id}><div className="file-icon"><FileText size={18}/></div><div><b>{d.name}</b><small>{d.type} · {d.size} · {d.date}</small></div><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span><button className="icon-btn" title="Unduh PDF" onClick={() => download(d)}><FileDown size={18}/></button></div>)}</div></section></> }
function Settings({ currentUser, users, authLog, adminContacts, setAdminContacts, notify }) {
  const [form, setForm] = useState({ type: 'whatsapp', value: '' })
  const [editingId, setEditingId] = useState(null)

  const whatsapp = adminContacts.find(c => c.type === 'whatsapp')?.value || '085771076965'
  const email = adminContacts.find(c => c.type === 'email')?.value || 'admin.siperan@kedungwaringin.go.id'

  function resetForm() {
    setForm({ type: 'whatsapp', value: '' })
    setEditingId(null)
  }

  function submitContact(e) {
    e.preventDefault()
    if (currentUser.role !== 'Super Admin') return
    const payload = { type: form.type, value: form.value.trim() }
    if (!payload.type || !payload.value) {
      notify('Isi tipe dan nilai kontak admin terlebih dahulu.')
      return
    }
    const request = editingId
      ? api(`/admin-contacts/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : api('/admin-contacts', { method: 'POST', body: JSON.stringify(payload) })

    request.then(contact => {
      if (editingId) {
        setAdminContacts(list => list.map(item => item.id === editingId ? { ...item, ...contact, ...payload } : item))
        notify('Kontak admin berhasil diperbarui')
      } else {
        setAdminContacts(list => [...list, { ...contact, ...payload }])
        notify('Kontak admin berhasil ditambahkan')
      }
      resetForm()
    }).catch(err => notify(err.message || 'Gagal menyimpan kontak admin'))
  }

  function deleteContact(id) {
    if (currentUser.role !== 'Super Admin') return
    api(`/admin-contacts/${id}`, { method: 'DELETE' }).then(() => {
      setAdminContacts(list => list.filter(item => item.id !== id))
      notify('Kontak admin berhasil dihapus')
      if (editingId === id) resetForm()
    }).catch(err => notify(err.message || 'Gagal menghapus kontak admin'))
  }

  function editContact(item) {
    setForm({ type: item.type, value: item.value })
    setEditingId(item.id)
  }

  return <><PageTitle eyebrow="Konfigurasi sistem" title="Pengaturan & Bantuan"/><div className="settings-grid"><section className="card settings-card"><div className="card-head"><div><h2>Profil & akses</h2><p>Akun dan kewenangan yang sedang digunakan.</p></div><Users className="muted-icon"/></div><div className="permission"><ShieldCheck size={18}/><div><b>{currentUser.name}</b><small>{currentUser.username} · {currentUser.role}</small></div></div><p className="muted">Data akun dan sesi tersimpan pada database lokal perangkat ini.</p></section><section className="card settings-card"><div className="card-head"><div><h2>Kontak admin</h2><p>Hubungi admin SIPERAN untuk bantuan dan koordinasi.</p></div><CircleHelp className="muted-icon"/></div><div className="contact-list">{adminContacts.map(contact => <a key={contact.id} href={contact.type === 'whatsapp' ? `https://wa.me/${contact.value.replace(/\D/g, '').replace(/^0/, '62')}` : `mailto:${contact.value}`} target={contact.type === 'whatsapp' ? '_blank' : undefined} rel={contact.type === 'whatsapp' ? 'noreferrer' : undefined}>{contact.type === 'whatsapp' ? 'WhatsApp:' : 'Email:'} {contact.value}</a>)}</div></section>{currentUser.role === 'Super Admin' && <section className="card settings-card"><div className="card-head"><div><h2>Kelola kontak admin</h2><p>Hanya Super Admin yang dapat menambah, memperbarui, atau menghapus kontak.</p></div><ShieldCheck className="muted-icon"/></div><form className="form-grid" onSubmit={submitContact}><label>Tipe kontak<select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></label><label>Nilai kontak<input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'whatsapp' ? 'Contoh: 085771076965' : 'Contoh: admin@domain.go.id'} /></label><div className="action-row"><button className="primary" type="submit">{editingId ? 'Simpan perubahan' : 'Tambah kontak'}</button>{editingId && <button className="secondary" type="button" onClick={resetForm}>Batal</button>}</div></form><div className="contact-list compact">{adminContacts.map(contact => <div className="mini-contact" key={contact.id}><span>{contact.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span><strong>{contact.value}</strong><div className="mini-contact-actions"><button type="button" className="secondary" onClick={() => editContact(contact)}>Edit</button><button type="button" className="danger" onClick={() => deleteContact(contact.id)}>Hapus</button></div></div>)}</div></section>}{currentUser.role === 'Super Admin' && <section className="card settings-card"><div className="card-head"><div><h2>Manajemen pengguna</h2><p>{users.length} akun terdaftar · {authLog.length} aktivitas autentikasi</p></div><Users className="muted-icon"/></div>{users.map(user => <div className="user-row" key={user.id}><div><b>{user.name}</b><small>{user.username}</small></div><span className="status">{user.role}</span></div>)}</section>}<section className="card settings-card"><div className="card-head"><div><h2>Panduan singkat</h2><p>Alur kerja SIPERAN yang direkomendasikan</p></div><CircleHelp className="muted-icon"/></div><ol className="guide"><li><b>Rencanakan</b><span>Tambahkan program, indikator, dan pagu.</span></li><li><b>Kendalikan</b><span>Perbarui realisasi dan lampirkan bukti.</span></li><li><b>Evaluasi</b><span>Verifikasi dokumen dan unduh laporan.</span></li></ol></section></div></> }
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</div></div> }

createRoot(document.getElementById('root')).render(<App />)
