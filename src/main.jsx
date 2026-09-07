import React, { useState, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { jsPDF } from 'jspdf'
import {
  Activity, AlertTriangle, BarChart3, Bell, CalendarDays, Check, ChevronDown,
  CircleHelp, ClipboardCheck, CloudDownload, FileDown, FileText, FolderOpen,
  Gauge, LayoutDashboard, Menu, Moon, MoreHorizontal, Plus, Search, Settings2,
  ShieldCheck, Sun, Target, Upload, Users, X, Zap, LogIn, LogOut, LockKeyhole,
  ClipboardList, FileUp, BadgeCheck, Archive, UserPlus, KeyRound, Trash2, RotateCcw,
  FileSpreadsheet, ClipboardPen, Route
} from 'lucide-react'
import './styles.css'

const bidangOptions = [
  'Sekretariat - Bagian Umum dan Kepegawaian',
  'Sekretariat - Bagian Perencanaan dan Keuangan',
  'Kasi Pelayanan Publik',
  'Kasi Ekonomi dan Pembangunan',
  'Kasi Pemtrantip',
  'Kasi Pemerintahan',
  'Kasi PMD',
]

const seedPrograms = [
  { id: 1, kode: 'PRG-001', nama: 'Peningkatan Jalan Lingkungan', bidang: 'Kasi Ekonomi dan Pembangunan', target: 12, realisasi: 9, pagu: 1850000000, status: 'Berjalan', penanggung: 'PPTK Infrastruktur', deadline: '2026-10-14' },
  { id: 2, kode: 'PRG-002', nama: 'Pelayanan Administrasi Terpadu', bidang: 'Kasi Pelayanan Publik', target: 100, realisasi: 82, pagu: 640000000, status: 'Berjalan', penanggung: 'Kasi Pemerintahan', deadline: '2026-11-20' },
  { id: 3, kode: 'PRG-003', nama: 'Pemberdayaan UMKM Desa', bidang: 'Kasi Ekonomi dan Pembangunan', target: 8, realisasi: 8, pagu: 920000000, status: 'Selesai', penanggung: 'Kasi Ekonomi dan Pembangunan', deadline: '2026-09-30' },
  { id: 4, kode: 'PRG-004', nama: 'Pencegahan Stunting Terpadu', bidang: 'Kasi PMD', target: 6, realisasi: 3, pagu: 770000000, status: 'Perlu perhatian', penanggung: 'Kasi PMD', deadline: '2026-09-18' },
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
const defaultApprovalBoard = [
 { id: 1, section: 'Sekretariat', status: 'Belum disetujui', notes: 'Menunggu review administrasi umum' },
 { id: 2, section: 'Pemantib', status: 'Belum disetujui', notes: 'Menunggu evaluasi program dan anggaran' },
 { id: 3, section: 'PMD', status: 'Belum disetujui', notes: 'Perlu konfirmasi output pemberdayaan' },
 { id: 4, section: 'Pelayanan Publik', status: 'Belum disetujui', notes: 'Tunggu validasi indikator layanan' },
 { id: 5, section: 'Kessos', status: 'Belum disetujui', notes: 'Menunggu review kebutuhan sosial' },
]

const navGroups = [
  { title: 'Utama', items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { title: 'Siklus Kinerja', items: [
    { id: 'perencanaan', label: 'Perencanaan', icon: Target },
    { id: 'usulan-rka', label: 'Usulan RKA / KAK', icon: ClipboardList, parent: 'Perencanaan' },
    { id: 'upload-pendukung', label: 'Upload Dokumen Pendukung', icon: FileUp, parent: 'Perencanaan' },
    { id: 'verifikasi-usulan', label: 'Verifikasi Usulan', icon: BadgeCheck, parent: 'Perencanaan' },
    { id: 'arsip', label: 'Arsip Renja & DPA', icon: FolderOpen, parent: 'Perencanaan' },
    { id: 'pengendalian', label: 'Pengendalian & Realisasi', icon: Activity },
    { id: 'lka', label: 'Lembar Kendali Anggaran (LKA)', icon: FileSpreadsheet, parent: 'Pengendalian' },
    { id: 'progres-spj', label: 'Input Progres Fisik & Keuangan', icon: ClipboardPen, parent: 'Pengendalian' },
    { id: 'status-spj', label: 'Status Verifikasi SPJ', icon: Route, parent: 'Pengendalian' },
    { id: 'evaluasi', label: 'Evaluasi & Pelaporan', icon: BarChart3 },
  ]},
  { title: 'Layanan', items: [
    { id: 'kalender', label: 'Kalender Kegiatan', icon: CalendarDays },
    { id: 'unduhan', label: 'Pusat Unduhan', icon: CloudDownload },
    { id: 'pengaturan', label: 'Pengaturan & Bantuan', icon: Settings2 },
  ]},
]

const planningSubPages = ['usulan-rka', 'upload-pendukung', 'verifikasi-usulan', 'arsip']

const api = (url, options = {}) => fetch(`/api${url}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options }).then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Permintaan gagal'); return r.status === 204 ? null : r.json() })
const createDocPreview = file => {
  if (!file) return 'Dokumen baru sedang menunggu review oleh admin SIPERAN.'
  if (file.type.startsWith('text/') || file.type.includes('json') || file.type.includes('xml') || file.type.includes('csv')) {
    return `Konten file dipindai dari dokumen ${file.name}. File siap ditinjau untuk validasi data, kelengkapan, dan kesesuaian target kegiatan.`
  }
  if (file.type.includes('pdf')) return `File PDF ${file.name} terlampir dan siap ditinjau untuk kelengkapan laporan serta riwayat kegiatan.`
  if (file.type.includes('sheet') || file.type.includes('excel')) return `File spreadsheet ${file.name} berisi data realisasi, pagu, dan capaian kegiatan yang sedang menunggu review.`
  return `Dokumen ${file.name} telah berhasil diunggah dan sedang dalam proses peninjauan administrasi.`
}
const formatFileSize = bytes => {
  if (!bytes || bytes < 1024) return '1 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  return `${Math.max(1, Math.round(value))} ${units[unitIndex]}`
}
const rupiah = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
const pct = (a, b) => Math.round((a / b) * 100)
const formatDate = date => new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
const greetingFor = hour => hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('SIPERAN render error:', error)
  }

  render() {
    if (this.state.hasError) {
      return <div className="error-fallback"><h2>Terjadi masalah pada tampilan</h2><p>Silakan refresh halaman atau masuk kembali ke aplikasi.</p><button className="primary" onClick={() => window.location.reload()}>Muat ulang</button></div>
    }
    return this.props.children
  }
}

function App() {
  const [users, setUsers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [authLog, setAuthLog] = useState([])
  const [adminContacts, setAdminContacts] = useState(defaultAdminContacts)
  const [active, setActive] = useState('dashboard')
  const [programs, setPrograms] = useState([])
  const [docs, setDocs] = useState([])
  const [reports, setReports] = useState([])
  const [events, setEvents] = useState([])
  const [approvalBoard, setApprovalBoard] = useState(defaultApprovalBoard)
  const [role, setRole] = useState('User')
  const [query, setQuery] = useState('')
  const [unitFilter, setUnitFilter] = useState('Semua Unit')
  const unitFilterOptions = ['Semua Unit', ...bidangOptions]
  const [modal, setModal] = useState(null)
  const [usulanRka, setUsulanRka] = useState([])
  const [spjList, setSpjList] = useState([])
  const [progressProgram, setProgressProgram] = useState(null)
  const [progressValue, setProgressValue] = useState(0)
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
    Promise.all([api('/programs'), api('/docs'), api('/monthly-reports'), api('/events'), api('/log'), api('/users'), api('/admin-contacts'), api('/section-approvals'), api('/usulan-rka'), api('/spj')]).then(([p,d,r,e,l,u,c,a,ur,sp]) => { setPrograms(p); setDocs(d); setReports(r); setEvents(e); setAuthLog(l); setUsers(u); setAdminContacts(c.length ? c : defaultAdminContacts); setApprovalBoard(a.length ? a : defaultApprovalBoard); setUsulanRka(ur); setSpjList(sp) }).catch(() => notify('Gagal memuat data server'))
  }, [currentUser])
  useEffect(() => {
    if (!currentUser) return
    const refreshData = () => {
      api('/events').then(setEvents).catch(() => {})
      api('/programs').then(setPrograms).catch(() => {})
      api('/spj').then(setSpjList).catch(() => {})
      api('/docs').then(setDocs).catch(() => {})
      api('/usulan-rka').then(setUsulanRka).catch(() => {})
      api('/section-approvals').then(a => setApprovalBoard(a.length ? a : defaultApprovalBoard)).catch(() => {})
    }
    const timer = setInterval(refreshData, 5000)
    return () => clearInterval(timer)
  }, [currentUser])

  const filteredByUnit = useMemo(() => programs.filter(p => unitFilter === 'Semua Unit' || p.bidang === unitFilter), [programs, unitFilter])
  const filtered = filteredByUnit.filter(p => `${p.nama} ${p.bidang} ${p.kode}`.toLowerCase().includes(query.toLowerCase()))
  const totalPagu = programs.reduce((s, p) => s + p.pagu, 0)
  const totalRealisasi = programs.reduce((s, p) => s + p.realisasi, 0)
  const overall = programs.length ? Math.round(programs.reduce((s, p) => s + pct(p.realisasi, p.target), 0) / programs.length) : 0
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
    e.preventDefault()
    if (!canWrite) return
    const f = new FormData(e.currentTarget)
    api('/programs', { method:'POST', body: JSON.stringify({ nama:f.get('nama'), bidang:f.get('bidang'), target:Number(f.get('target')), pagu:Number(f.get('pagu')), penanggung:f.get('penanggung'), deadline:f.get('deadline') }) }).then(p => { setPrograms([...programs,p]); setModal(null); notify('Program baru berhasil ditambahkan') }).catch(e => notify(e.message))
  }
  function addDoc(e) {
    if (!canWrite) return
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('file')
    if (!file || !file.name) return

    const payload = new FormData()
    payload.append('file', file)
    payload.append('name', file.name)
    payload.append('type', form.get('type'))
    if (form.get('periode')) payload.append('periode', form.get('periode'))
    payload.append('size', formatFileSize(file.size))
    payload.append('preview', createDocPreview(file))

    fetch('/api/docs', {
      method: 'POST',
      credentials: 'include',
      body: payload,
    }).then(async response => {
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Gagal mengunggah dokumen')
      setDocs([data, ...docs])
      setModal(null)
      notify('Dokumen berhasil diunggah dan menunggu verifikasi')
    }).catch(err => notify(err.message || 'Gagal mengunggah dokumen'))
  }
  function verifyDoc(id) {
    if (!canWrite) return
    const doc = docs.find(item => item.id === id)
    const notes = `Dokumen ditinjau oleh ${currentUser.name} (${currentUser.role}) pada ${new Date().toLocaleString('id-ID')}.`
    api(`/docs/${id}`, { method:'PATCH', body:JSON.stringify({ status:'Terverifikasi', preview: doc?.preview || 'Dokumen sudah ditinjau dan disetujui untuk proses selanjutnya.' }) })
      .then(() => api(`/docs/${id}/review`, { method:'POST', body: JSON.stringify({ reviewer: currentUser.name, action: 'Terverifikasi', notes }) }))
      .then(review => {
        setDocs(docs.map(d => d.id === id ? { ...d, status:'Terverifikasi', preview: d.preview || 'Dokumen sudah ditinjau dan disetujui untuk proses selanjutnya.', review_log: [...(d.review_log || []), review] } : d));
        notify('Dokumen ditandai terverifikasi')
      })
      .catch(e => notify(e.message))
  }
  function deleteDoc(id) {
    if (currentUser.role !== 'Super Admin') return
    const doc = docs.find(item => item.id === id)
    if (!doc || !window.confirm(`Hapus dokumen "${doc.name}"?`)) return
    api(`/docs/${id}`, { method: 'DELETE' })
      .then(() => {
        setDocs(list => list.filter(item => item.id !== id))
        notify('Dokumen berhasil dihapus')
      })
      .catch(error => notify(error.message || 'Gagal menghapus dokumen'))
  }
  function addEvent(e) {
    if (!canWrite) return
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    api('/events', { method: 'POST', body: JSON.stringify({ date: form.get('date'), title: form.get('title'), type: form.get('type') }) })
      .then(event => {
        setEvents(list => [...list, event].sort((a, b) => a.date.localeCompare(b.date)))
        setModal(null)
        notify('Kegiatan berhasil ditambahkan ke kalender')
      })
      .catch(error => notify(error.message || 'Gagal menambahkan kegiatan'))
  }
  function updateEvent(e) {
    if (!canWrite || !modal?.event) return
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    api(`/events/${modal.event.id}`, { method: 'PATCH', body: JSON.stringify({ date: form.get('date'), title: form.get('title'), type: form.get('type') }) })
      .then(updated => {
        setEvents(list => list.map(item => item.id === updated.id ? updated : item).sort((a, b) => a.date.localeCompare(b.date)))
        setModal(null)
        notify('Kegiatan agenda berhasil diperbarui')
      })
      .catch(error => notify(error.message || 'Gagal memperbarui kegiatan'))
  }
  function deleteEvent(id) {
    if (currentUser.role !== 'Super Admin') return
    api(`/events/${id}`, { method: 'DELETE' })
      .then(() => {
        setEvents(list => list.filter(event => event.id !== id))
        notify('Kegiatan berhasil dihapus')
      })
      .catch(error => notify(error.message || 'Gagal menghapus kegiatan'))
  }
  function approveSection(section, status) {
    if (!canWrite) return
    const notes = status === 'Disetujui' ? 'Persetujuan diterbitkan oleh admin untuk sesi ini.' : 'Persetujuan ditolak dan perlu revisi lanjutan.'
    api(`/section-approvals/${encodeURIComponent(section)}`, { method:'PATCH', body: JSON.stringify({ status, notes }) }).then(updated => {
      setApprovalBoard(list => list.map(item => item.section === section ? { ...item, ...updated } : item))
      notify(`${section} ditetapkan ${status.toLowerCase()}`)
    }).catch(e => notify(e.message))
  }
  const canWrite = currentUser.role !== 'User'
  const isPerencanaan = ['Admin', 'Super Admin'].includes(currentUser.role)
  function submitUsulan(e) {
    if (!canWrite) return
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    api('/usulan-rka', { method: 'POST', body: JSON.stringify({
      judul: f.get('judul'), bidang: f.get('bidang'), jenis: f.get('jenis'),
      tahun_anggaran: f.get('tahun_anggaran'), pagu: Number(f.get('pagu')) || 0,
      penanggung: f.get('penanggung'), target: f.get('target'),
      batas_waktu: f.get('batas_waktu'), catatan: f.get('catatan')
    }) }).then(item => {
      setUsulanRka(list => [item, ...list]); setModal(null); notify('Usulan RKA/KAK berhasil dikirim dan menunggu verifikasi')
    }).catch(err => notify(err.message || 'Gagal menyimpan usulan'))
  }
  function uploadDokumenPendukung(e, usulanId) {
    if (!canWrite) return
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const file = form.get('file')
    if (!file || !file.name) return
    const payload = new FormData()
    payload.append('file', file)
    payload.append('jenis_dokumen', form.get('jenis_dokumen'))
    payload.append('size', formatFileSize(file.size))
    fetch(`/api/usulan-rka/${usulanId}/dokumen`, { method: 'POST', credentials: 'include', body: payload })
      .then(async r => { const data = await r.json().catch(() => null); if (!r.ok) throw new Error(data?.error || 'Gagal mengunggah dokumen'); return data })
      .then(doc => {
        setUsulanRka(list => list.map(item => item.id === Number(usulanId) ? { ...item, dokumen: [...(item.dokumen || []), doc] } : item))
        setModal(null)
        notify('Dokumen pendukung berhasil diunggah')
      })
      .catch(err => notify(err.message || 'Gagal mengunggah dokumen'))
  }
  function verifyUsulan(id, keputusan, catatan) {
    if (!isPerencanaan) return
    api(`/usulan-rka/${id}/verifikasi`, { method: 'PATCH', body: JSON.stringify({ keputusan, catatan }) })
      .then(updated => {
        setUsulanRka(list => list.map(item => item.id === updated.id ? updated : item))
        notify(`Usulan ditandai ${keputusan.toLowerCase()}`)
      })
      .catch(err => notify(err.message || 'Gagal memperbarui status usulan'))
  }
  function deleteUsulan(id) {
    if (currentUser.role !== 'Super Admin') return
    if (!window.confirm('Hapus usulan ini beserta seluruh dokumen pendukungnya?')) return
    api(`/usulan-rka/${id}`, { method: 'DELETE' })
      .then(() => { setUsulanRka(list => list.filter(item => item.id !== id)); notify('Usulan berhasil dihapus') })
      .catch(err => notify(err.message || 'Gagal menghapus usulan'))
  }
  function removeProgram(id) {
    if (!canWrite) return
    api(`/programs/${id}`, {method:'DELETE'}).then(() => { setPrograms(programs.filter(program => program.id !== id)); notify('Program berhasil dihapus') })
  }
  function addSpj(e) {
    e.preventDefault()
    if (!canWrite) return
    const f = new FormData(e.target)
    fetch('/api/spj', { method: 'POST', credentials: 'include', body: f })
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Gagal menyimpan SPJ'); return r.json() })
      .then(item => { setSpjList(list => [item, ...list]); setModal(null); notify('SPJ pencairan berhasil dicatat dan masuk tahap review') })
      .catch(err => notify(err.message || 'Gagal menyimpan SPJ'))
  }
  function updateSpjProgress(e, spj) {
    e.preventDefault()
    if (!canWrite) return
    const f = new FormData(e.target)
    api(`/spj/${spj.id}`, { method: 'PATCH', body: JSON.stringify({
      nilai_pencairan: Number(f.get('nilai_pencairan')) || 0,
      progres_fisik: Number(f.get('progres_fisik')) || 0,
      progres_keuangan: Number(f.get('progres_keuangan')) || 0,
      catatan: f.get('catatan') || null
    }) }).then(updated => {
      setSpjList(list => list.map(item => item.id === updated.id ? updated : item))
      setModal(null)
      notify(`Progres ${spj.nama_kegiatan} diperbarui: fisik ${updated.progres_fisik}% · keuangan ${updated.progres_keuangan}%`)
    }).catch(err => notify(err.message || 'Gagal memperbarui progres'))
  }
  function advanceSpjStatus(spj, nextStatus, catatan) {
    if (!canWrite) return
    api(`/spj/${spj.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus, catatan_status: catatan }) })
      .then(updated => {
        setSpjList(list => list.map(item => item.id === updated.id ? updated : item))
        notify(`Status SPJ diperbarui: ${nextStatus}`)
      })
      .catch(err => notify(err.message || 'Gagal memperbarui status SPJ'))
  }
  function deleteSpj(id) {
    if (currentUser.role !== 'Super Admin') return
    if (!window.confirm('Hapus catatan SPJ pencairan ini?')) return
    api(`/spj/${id}`, { method: 'DELETE' })
      .then(() => { setSpjList(list => list.filter(item => item.id !== id)); notify('Catatan SPJ berhasil dihapus') })
      .catch(err => notify(err.message || 'Gagal menghapus SPJ'))
  }
  function openProgressEditor(program) {
    setProgressProgram(program)
    setProgressValue(program.target ? Math.min(100, Math.round((program.realisasi / program.target) * 100)) : 0)
  }
  function saveProgress() {
    if (!progressProgram || !canWrite) return
    const realisasi = Math.round((progressValue / 100) * progressProgram.target)
    const status = realisasi >= progressProgram.target ? 'Selesai' : progressValue >= 75 ? 'Berjalan' : 'Perlu perhatian'
    const updated = { ...progressProgram, realisasi, status }
    api(`/programs/${progressProgram.id}`, { method: 'PATCH', body: JSON.stringify(updated) })
      .then(() => {
        setPrograms(list => list.map(item => item.id === updated.id ? updated : item))
        setProgressProgram(null)
        notify(`Progress ${updated.kode} disimpan: ${progressValue}%`)
      })
      .catch(error => notify(error.message || 'Gagal menyimpan progress'))
  }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebar ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">S</div><div><b>SIPERAN</b><small>KEDUNGWARINGIN</small></div><button className="close-nav" onClick={() => setSidebar(false)}><X size={18}/></button></div>
      <div className="office"><span className="online-dot"/> Kecamatan Kedungwaringin <ChevronDown size={14}/></div>
      <nav>{navGroups.map(g => <div className="nav-group" key={g.title}><label>{g.title}</label>{g.items.map(({ id, label, icon: Icon }) => <button key={id} className={active === id ? 'active' : ''} onClick={() => { setActive(id); setSidebar(false) }}><Icon size={18}/><span>{label}</span>{id === 'pengendalian' && <em>4</em>}</button>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><CircleHelp size={18}/><div><b>Butuh bantuan?</b><small>Silakan hubungi Admin SIPERAN Kedungwaringin</small>{(() => { const wa = adminContacts.find(c => c.type === 'whatsapp')?.value || '085771076965'; const waLink = `https://wa.me/${wa.replace(/\D/g, '').replace(/^0/, '62')}`; return <><a className="help-link" href={waLink} target="_blank" rel="noreferrer">Hubungi Admin</a>{currentUser.role === 'Super Admin' && <button type="button" className="help-link" onClick={() => setActive('pengaturan')}>Edit Nomor HP & Email</button>}</> })()}</div></div><div className="user-mini"><div className="avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div><div><b>{currentUser.name}</b><small>{currentUser.role}</small></div><button className="logout-btn" title="Keluar" onClick={signOut}><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="hamburger" onClick={() => setSidebar(true)}><Menu size={21}/></button><div className="breadcrumbs"><span>SIPERAN</span><b>/</b><strong>{navGroups.flatMap(g => g.items).find(i => i.id === active)?.label}</strong></div><div className="top-actions"><div className="role-select"><ShieldCheck size={16}/><span>{currentUser.role}</span></div><span className="realtime-indicator" title="Data diperbarui otomatis setiap 5 detik"><span className="online-dot"/>Realtime</span><button className="theme-switch" onClick={() => setTheme(curr => curr === 'light' ? 'dark' : 'light')} aria-label="Ganti tema"><span className="theme-icon">{theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}</span><span>{theme === 'light' ? 'Mode gelap' : 'Mode terang'}</span></button><div className="notification-wrap"><button className="icon-btn notification" onClick={() => setNotificationsOpen(v => !v)} aria-label="Lihat notifikasi"><Bell size={19}/>{notificationCount > 0 && <span className="notification-badge">{notificationCount}</span>}</button>{notificationsOpen && <div className="notification-panel"><div className="notification-head"><b>Notifikasi</b><span>{notificationCount} perlu tindak lanjut</span></div>{notifications.map(item => <div className="notification-item" key={item.id}><div className="notification-copy"><b>{item.title}</b><small>{item.detail}</small></div><button className="secondary xs" onClick={() => { setActive(item.href); setNotificationsOpen(false) }}>{item.action}</button></div>)}</div>}</div><div className="top-avatar">{currentUser.name.slice(0, 2).toUpperCase()}</div></div></header>
      <div className="content">
        {active === 'dashboard' && <Dashboard programs={filtered} docs={docs} events={events} overall={overall} totalPagu={totalPagu} totalRealisasi={totalRealisasi} onNavigate={setActive} currentUnit={unitFilter} onUnitFilterChange={setUnitFilter} unitFilterOptions={unitFilterOptions} />}
        {active === 'kalender' && <CalendarPage events={events} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} onAdd={() => setModal('event')} onEdit={event => setModal({ type: 'edit-event', event })} onDelete={deleteEvent} />}
        {active === 'perencanaan' && <Planning programs={filtered} query={query} setQuery={setQuery} onAdd={() => setModal('program')} onDelete={removeProgram} onProgress={openProgressEditor} canWrite={canWrite} currentUnit={unitFilter} onUnitFilterChange={setUnitFilter} unitFilterOptions={unitFilterOptions} onNavigate={setActive} />}
        {active === 'usulan-rka' && <UsulanRkaPage usulanRka={usulanRka} canWrite={canWrite} onAdd={() => setModal('usulan-rka')} onUpload={id => setModal({ type: 'upload-pendukung', usulanId: id })} onVerify={verifyUsulan} onDelete={deleteUsulan} isPerencanaan={isPerencanaan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'upload-pendukung' && <UploadPendukungPage usulanRka={usulanRka} canWrite={canWrite} onUpload={id => setModal({ type: 'upload-pendukung', usulanId: id })} onDelete={deleteUsulan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'verifikasi-usulan' && <VerifikasiUsulanPage usulanRka={usulanRka} isPerencanaan={isPerencanaan} onVerify={verifyUsulan} onDelete={deleteUsulan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'pengendalian' && <Control programs={programs} setPrograms={setPrograms} onUpload={() => setModal('doc')} canWrite={canWrite} notify={notify} />}
        {active === 'lka' && <LkaPage programs={programs} spjList={spjList} />}
        {active === 'progres-spj' && <ProgresSpjPage spjList={spjList} programs={programs} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} onAdd={() => setModal('spj-add')} onUpdate={spj => setModal({ type: 'spj-progress', spj })} onDelete={deleteSpj} notify={notify} />}
        {active === 'status-spj' && <StatusSpjPage spjList={spjList} canWrite={canWrite} onAdvance={advanceSpjStatus} notify={notify} />}
        {active === 'evaluasi' && <Evaluation programs={programs} docs={docs} approvalBoard={approvalBoard} onUpload={() => setModal('report')} onVerify={verifyDoc} onDelete={deleteDoc} onApprove={approveSection} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'unduhan' && <Downloads docs={docs} onUpload={() => setModal('doc')} onDelete={deleteDoc} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'arsip' && <PlanningArchive docs={docs} onUpload={() => setModal('doc')} onDelete={deleteDoc} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'pengaturan' && <Settings notify={notify} currentUser={currentUser} users={users} setUsers={setUsers} authLog={authLog} adminContacts={adminContacts} setAdminContacts={setAdminContacts} />}
      </div>
    </main>
    {modal === 'program' && canWrite && <Modal title="E-Usulan Kegiatan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addProgram}><label className="full">Nama usulan kegiatan<input required name="nama" placeholder="Contoh: Peningkatan Jalan Lingkungan" /></label><label>Bidang<select name="bidang">{bidangOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>Pagu anggaran (Rp)<input required name="pagu" type="number" min="0" /></label><label>Target (%)<input required name="target" type="number" min="1" max="100" /></label><label>Penanggung jawab (Kasi / PPTK)<input required name="penanggung" placeholder="Contoh: PPTK Infrastruktur" /></label><label>Deadline<input name="deadline" type="date" /></label><button className="primary full" type="submit"><Plus size={17}/> Tambah E-Usulan Kegiatan</button></form></Modal>}
    {modal === 'usulan-rka' && canWrite && <Modal title="Usulan RKA / KAK" onClose={() => setModal(null)}><form className="form-grid" onSubmit={submitUsulan}><label className="full">Judul usulan kegiatan<input required name="judul" placeholder="Contoh: Rehabilitasi drainase pasar desa" /></label><label>Bidang<select name="bidang">{bidangOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label><label>Jenis usulan<select name="jenis"><option>Tahunan</option><option>Perubahan</option></select></label><label>Tahun anggaran<input required name="tahun_anggaran" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear() + 1} /></label><label>Pagu anggaran (Rp)<input required name="pagu" type="number" min="0" /></label><label>Penanggung jawab (Kasi / PPTK)<input required name="penanggung" placeholder="Contoh: PPTK Infrastruktur" /></label><label>Target indikator / output<input required name="target" placeholder="Contoh: 2.400 m jalan ditingkatkan" /></label><label>Batas waktu<input required name="batas_waktu" type="date" /></label><label className="full">Catatan tambahan<textarea name="catatan" rows={3} placeholder="Opsional: keterangan pendukung usulan" /></label><button className="primary full" type="submit"><Plus size={17}/> Kirim usulan RKA / KAK</button></form></Modal>}
    {modal?.type === 'upload-pendukung' && canWrite && <Modal title="Upload Dokumen Pendukung" onClose={() => setModal(null)}><form className="form-grid" onSubmit={e => uploadDokumenPendukung(e, modal.usulanId)}><label className="full">Jenis dokumen<select name="jenis_dokumen"><option>KAK</option><option>RAB</option><option>Jadwal Pelaksanaan</option></select></label><label className="upload-field full">Pilih berkas<input required name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><p className="muted">Format PDF, Excel, atau Word. Maksimal 10 MB per dokumen.</p><button className="primary full" type="submit"><Upload size={17}/> Unggah dokumen</button></form></Modal>}
    {progressProgram && canWrite && <Modal title={`Atur progress ${progressProgram.kode}`} onClose={() => setProgressProgram(null)}><div className="progress-editor"><p><b>{progressProgram.nama}</b></p><label>Progress saat ini: <strong>{progressValue}%</strong><input type="range" min="0" max="100" step="10" value={progressValue} onChange={e => setProgressValue(Number(e.target.value))}/></label><div className="step-grid">{[0,10,20,30,40,50,60,70,80,90,100].map(step => <button type="button" key={step} className={`step-btn ${progressValue === step ? 'active' : ''}`} onClick={() => setProgressValue(step)}>{step}%</button>)}</div><div className="modal-actions"><button className="secondary" type="button" onClick={() => setProgressProgram(null)}>Batal</button><button className="primary" type="button" onClick={saveProgress}>Simpan progress</button></div></div></Modal>}
    {modal === 'doc' && canWrite && <Modal title="Unggah dokumen" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addDoc}><label>Jenis dokumen<select name="type"><option>Renstra</option><option>Renja</option><option>DPA</option><option>RAK</option><option>Perencanaan</option><option>Pelaporan</option><option>Evaluasi</option><option>Lainnya</option></select></label><label className="upload-field">Pilih berkas<input required name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><p className="muted">Format PDF, Excel, atau Word. Maksimal 10 MB.</p><button className="primary full" type="submit"><Upload size={17}/> Unggah dokumen</button></form></Modal>}
    {modal === 'spj-add' && canWrite && <Modal title="Input Berkas SPJ Pencairan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addSpj}><label className="full">Kegiatan (dari E-Usulan)<select name="program_id" defaultValue=""><option value="">-- Tanpa mengaitkan kegiatan --</option>{programs.map(p => <option key={p.id} value={p.id}>{p.kode} · {p.nama}</option>)}</select></label><label className="full">Nama kegiatan / pencairan<input required name="nama_kegiatan" placeholder="Contoh: Pencairan DP Rehabilitasi Jalan" /></label><label>Pagu (Rp)<input name="pagu" type="number" min="0" placeholder="Otomatis dari kegiatan" /></label><label>Nilai pencairan (Rp)<input required name="nilai_pencairan" type="number" min="0" /></label><label>Progres fisik (%)<input name="progres_fisik" type="number" min="0" max="100" defaultValue={0} /></label><label>Progres keuangan (%)<input name="progres_keuangan" type="number" min="0" max="100" defaultValue={0} /></label><label>No. SPJ<input name="no_spj" placeholder="Contoh: 800/123/SPJ/2026" /></label><label>Tanggal SPJ<input name="tanggal_spj" type="date" /></label><label className="upload-field full">Berkas SPJ (opsional)<input name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><p className="muted">Berkas SPJ / bukti pencairan. Maksimal 10 MB.</p><button className="primary full" type="submit"><Upload size={17}/> Simpan SPJ</button></form></Modal>}
    {modal?.type === 'spj-progress' && canWrite && <Modal title={`Update Progres: ${modal.spj.nama_kegiatan}`} onClose={() => setModal(null)}><form className="form-grid" onSubmit={e => updateSpjProgress(e, modal.spj)}><label>Nilai pencairan (Rp)<input name="nilai_pencairan" type="number" min="0" defaultValue={modal.spj.nilai_pencairan} /></label><label>Progres fisik (%)<input name="progres_fisik" type="number" min="0" max="100" defaultValue={modal.spj.progres_fisik} /></label><label>Progres keuangan (%)<input name="progres_keuangan" type="number" min="0" max="100" defaultValue={modal.spj.progres_keuangan} /></label><label className="full">Catatan PPTK<textarea name="catatan" rows={3} defaultValue={modal.spj.catatan || ''} /></label><div className="modal-actions"><button className="secondary" type="button" onClick={() => setModal(null)}>Batal</button><button className="primary" type="submit"><Check size={16}/> Simpan progres</button></div></form></Modal>}
    {modal === 'report' && canWrite && <Modal title="Unggah laporan triwulan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addDoc}><label>Periode laporan<select required name="periode"><option value="">Pilih periode</option><option>Triwulan I</option><option>Triwulan II</option><option>Triwulan III</option></select></label><label className="upload-field">Pilih berkas<input required name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><input type="hidden" name="type" value="Pelaporan" /><p className="muted">Unggah laporan untuk periode Triwulan I, II, atau III. Maksimal 10 MB.</p><button className="primary full" type="submit"><Upload size={17}/> Unggah laporan</button></form></Modal>}
    {modal === 'event' && canWrite && <Modal title="Tambah kegiatan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addEvent}><label className="full">Nama kegiatan<input required name="title" placeholder="Contoh: Rapat koordinasi bulanan" /></label><label>Tanggal<input required name="date" type="date" /></label><label>Jenis kegiatan<select name="type"><option>Rapat</option><option>Deadline</option><option>Monitoring</option><option>Evaluasi</option><option>Lainnya</option></select></label><button className="primary full" type="submit"><Plus size={17}/> Simpan kegiatan</button></form></Modal>}
    {modal?.type === 'edit-event' && canWrite && <Modal title="Edit kegiatan agenda" onClose={() => setModal(null)}><form className="form-grid" onSubmit={updateEvent}><label className="full">Nama kegiatan<input required name="title" defaultValue={modal.event.title} /></label><label>Tanggal<input required name="date" type="date" defaultValue={modal.event.date} /></label><label>Jenis kegiatan<select name="type" defaultValue={modal.event.type}><option>Rapat</option><option>Deadline</option><option>Monitoring</option><option>Evaluasi</option><option>Lainnya</option></select></label><div className="modal-actions"><button className="secondary" type="button" onClick={() => setModal(null)}>Batal</button><button className="primary" type="submit"><Check size={16}/> Simpan perubahan</button></div></form></Modal>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

function Login({ users, onLogin }) {
  const [tab, setTab] = useState('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState('')
  const [captchaInput, setCaptchaInput] = useState('')

  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    bidang: bidangOptions[0],
    email: '',
    password: '',
    confirmPassword: ''
  })

  const loadCaptcha = () => {
    api('/auth/captcha')
      .then(data => setCaptcha(data.captcha))
      .catch(() => setError('CAPTCHA gagal dimuat.'))
  }

  useEffect(() => {
    if (tab === 'signin') {
      loadCaptcha()
    }
  }, [tab])

  function handleSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: form.get('username'),
        password: form.get('password'),
        captcha: captchaInput
      })
    })
      .then(onLogin)
      .catch(err => {
        setError(err.message || 'Login gagal.')
        setCaptchaInput('')
        loadCaptcha()
      })
      .finally(() => setLoading(false))
  }

  function handleSignUp(e) {
    e.preventDefault()
    setError('')

    if (regForm.password !== regForm.confirmPassword) {
      setError('Konfirmasi password tidak cocok.')
      return
    }
    if (regForm.password.length < 6) {
      setError('Password minimal 6 karakter.')
      return
    }

    setLoading(true)
    api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: regForm.name,
        username: regForm.username,
        bidang: regForm.bidang,
        email: regForm.email,
        password: regForm.password
      })
    })
      .then(onLogin)
      .catch(err => setError(err.message || 'Pendaftaran gagal.'))
      .finally(() => setLoading(false))
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <div className="brand-mark">S</div>
          <div>
            <b>SIPERAN</b>
            <small>KEDUNGWARINGIN</small>
          </div>
        </div>

        <div className="login-heading">
          <span className="eyebrow">Sistem Perencanaan dan Pelaporan Terpadu</span>
          <h1>{tab === 'signin' ? 'Selamat Datang' : 'Pendaftaran Akun'}</h1>
          <p>
            {tab === 'signin'
              ? 'Masuk untuk mengelola kinerja Kecamatan Kedungwaringin.'
              : 'Daftarkan akun staf/pejabat unit untuk mengakses SIPERAN.'}
          </p>
        </div>

        {tab === 'signin' ? (
          <form className="login-form" onSubmit={handleSignIn}>
            <label>
              Username
              <input name="username" required autoComplete="username" placeholder="Masukkan username" />
            </label>
            <label>
              Password
              <input name="password" required type="password" autoComplete="current-password" placeholder="Masukkan password" />
            </label>
            <div className="captcha-box">
              <div className="captcha-image" aria-label="Kode CAPTCHA">
                {captcha
                  ? <img src={captcha} alt="Kode CAPTCHA" draggable="false" />
                  : <span className="captcha-loading">Memuat kode…</span>}
              </div>
              <button className="secondary captcha-refresh" type="button" onClick={loadCaptcha} aria-label="Ganti kode CAPTCHA"><RotateCcw size={16} /></button>
            </div>
            <label>
              Kode CAPTCHA
              <input
                required
                value={captchaInput}
                onChange={e => setCaptchaInput(e.target.value.toUpperCase())}
                autoComplete="off"
                placeholder="Masukkan huruf dan angka"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button className="primary full" type="submit" disabled={loading}>
              <LogIn size={17} /> {loading ? 'Memproses...' : 'Masuk ke aplikasi'}
            </button>
            <p className="auth-switch-text">
              Belum memiliki akun?{' '}
              <button type="button" className="text-link" onClick={() => { setTab('signup'); setError(''); }}>
                Daftar akun baru di sini
              </button>
            </p>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleSignUp}>
            <label>
              Nama Lengkap
              <input
                required
                value={regForm.name}
                onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                placeholder="Contoh: Budi Santoso, S.STP"
              />
            </label>
            <label>
              Username
              <input
                required
                value={regForm.username}
                onChange={e => setRegForm({ ...regForm, username: e.target.value.toLowerCase() })}
                placeholder="Contoh: budi_santoso"
                autoComplete="off"
              />
            </label>
            <label>
              Unit / Seksi Kerja
              <select
                value={regForm.bidang}
                onChange={e => setRegForm({ ...regForm, bidang: e.target.value })}
              >
                {bidangOptions.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <label>
              Email (Opsional)
              <input
                type="email"
                value={regForm.email}
                onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                placeholder="Contoh: budi@kecamatan.go.id"
              />
            </label>
            <label>
              Password (Minimal 6 karakter)
              <input
                required
                type="password"
                value={regForm.password}
                onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                placeholder="Buat password aman"
                autoComplete="new-password"
              />
            </label>
            <label>
              Konfirmasi Password
              <input
                required
                type="password"
                value={regForm.confirmPassword}
                onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                placeholder="Ulangi password"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="login-error">{error}</p>}
            <button className="primary full" type="submit" disabled={loading}>
              <UserPlus size={17} /> {loading ? 'Mendaftarkan...' : 'Daftar & Masuk ke Aplikasi'}
            </button>
            <p className="auth-switch-text">
              Sudah memiliki akun?{' '}
              <button type="button" className="text-link" onClick={() => { setTab('signin'); setError(''); }}>
                Masuk di sini
              </button>
            </p>
          </form>
        )}
      </section>
    </main>
  )
}

function PageTitle({ eyebrow, title, children }) { return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div><div className="title-actions">{children}</div></div> }
function Button({ children, onClick, secondary = false }) { return <button onClick={onClick} className={secondary ? 'secondary' : 'primary'}>{children}</button> }
function Stat({ label, value, note, icon: Icon, tone = 'green' }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div></div> }

function Dashboard({ programs, docs, events, overall, totalPagu, totalRealisasi, onNavigate, currentUnit, onUnitFilterChange, unitFilterOptions }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  const monthEvents = events.filter(e => e.date.startsWith('2026-09'))
  return <><PageTitle eyebrow={`Ringkasan kinerja · ${formatDate(now)}`} title={greetingFor(now.getHours())}><div className="title-actions-inline"><p className="subtitle">Pantau perencanaan dan kinerja Kecamatan Kedungwaringin dalam satu tempat.</p><label className="filter-select-wrap"><span>Unit</span><select value={currentUnit} onChange={e => onUnitFilterChange(e.target.value)}>{unitFilterOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div></PageTitle>
    <div className="stat-grid"><Stat label="Realisasi anggaran" value={rupiah(totalRealisasi * 10000000)} note={currentUnit === 'Semua Unit' ? '▲ 8,4% dari bulan lalu' : `Unit: ${currentUnit}`} icon={Gauge}/><Stat label="Progress kinerja" value={`${overall}%`} note={currentUnit === 'Semua Unit' ? 'Dari seluruh program' : `Dari ${programs.length} program aktif`} icon={Target} tone="blue"/><Stat label="Program berjalan" value={programs.filter(p => p.status === 'Berjalan').length} note={`${programs.filter(p => p.status === 'Perlu perhatian').length} perlu perhatian`} icon={Activity} tone="orange"/><Stat label="Dokumen masuk" value={docs.length} note={`${docs.filter(d => d.status === 'Menunggu verifikasi').length} menunggu verifikasi`} icon={FolderOpen} tone="purple"/></div>
    <div className="dashboard-grid"><section className="card performance-card"><div className="card-head"><div><h2>Ikhtisar kinerja program</h2><p>Perbandingan target dan realisasi tahun anggaran 2026</p></div><button className="link-btn" onClick={() => onNavigate('pengendalian')}>Lihat detail <span>→</span></button></div><div className="chart"><div className="y-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="bars">{programs.map(p => <div className="bar-group" key={p.id}><div className="bar-wrap"><div className="bar target" style={{height: `${Math.min(100, pct(p.target, p.target))}%`}}/><div className="bar actual" style={{height: `${Math.min(100, pct(p.realisasi, p.target))}%`}}/></div><span>{p.kode}</span></div>)}</div><div className="legend"><span><i className="legend-target"/>Target</span><span><i className="legend-actual"/>Realisasi</span></div></div></section><section className="card warning-card"><div className="card-head"><div><h2>Early warning</h2><p>Perlu ditindaklanjuti minggu ini</p></div><AlertTriangle className="warning-icon" size={21}/></div><div className="warnings">{programs.filter(p => p.status === 'Perlu perhatian').map(p => <div className="warning-item" key={p.id}><div className="warning-dot"/><div><b>{p.nama}</b><small>Realisasi {pct(p.realisasi, p.target)}% · Batas {new Date(p.deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</small></div><button onClick={() => onNavigate('pengendalian')}>Tindak</button></div>)}<div className="warning-item info"><div className="warning-dot blue"/><div><b>1 dokumen menunggu verifikasi</b><small>Laporan Realisasi Triwulan II.xlsx</small></div><button onClick={() => onNavigate('evaluasi')}>Review</button></div></div></section></div>
    <div className="dashboard-grid lower"><section className="card"><div className="card-head"><div><h2>Agenda terdekat</h2><p>Jadwal kegiatan dan tenggat pelaporan</p></div><CalendarDays size={20} className="muted-icon"/></div><div className="agenda">{monthEvents.map(e => <div className="agenda-row" key={e.date}><div className="date-box"><b>{new Date(e.date).getDate()}</b><small>SEP</small></div><div><b>{e.title}</b><small>{e.type} · Kecamatan Kedungwaringin</small></div><span className={`tag ${e.type === 'Deadline' ? 'orange' : ''}`}>{e.type}</span></div>)}</div></section><section className="card activity-card"><div className="card-head"><div><h2>Aktivitas terbaru</h2><p>Jejak perubahan terakhir di sistem</p></div><button className="link-btn" onClick={() => onNavigate('unduhan')}>Semua aktivitas →</button></div><div className="timeline"><ActivityItem icon={Upload} title="Laporan Realisasi Triwulan II.xlsx" text="diunggah oleh Admin" time="2 jam lalu"/><ActivityItem icon={ClipboardCheck} title="PRG-003 ditandai selesai" text="oleh Camat/Sekcam" time="Kemarin"/><ActivityItem icon={FileText} title="Rencana Kerja Kecamatan 2026.pdf" text="terverifikasi" time="2 hari lalu"/></div></section></div>
  </>
}
function ActivityItem({ icon: Icon, title, text, time }) { return <div className="timeline-row"><div className="timeline-icon"><Icon size={16}/></div><div><b>{title}</b><small>{text}</small></div><time>{time}</time></div> }

function CalendarPage({ events, canWrite, isSuperAdmin, onAdd, onEdit, onDelete }) {
  const [lastSync, setLastSync] = useState(() => new Date())
  useEffect(() => {
    setLastSync(new Date())
  }, [events])
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date))
  return <><PageTitle eyebrow="Layanan kegiatan" title="Kalender Kegiatan"><div className="title-actions-inline"><span className="subtitle">Diperbarui realtime setiap 5 detik · Sinkron terakhir {lastSync.toLocaleTimeString('id-ID')}</span>{canWrite && <Button onClick={onAdd}><Plus size={17}/> Tambah kegiatan</Button>}</div></PageTitle><section className="card table-card"><div className="table-toolbar"><div><h2>Agenda Kecamatan Kedungwaringin</h2><p>{events.length} kegiatan terjadwal</p></div><CalendarDays className="muted-icon"/></div><div className="download-list">{sortedEvents.length ? sortedEvents.map(event => { const eventDate = new Date(`${event.date}T00:00:00`); return <div className="download-row" key={event.id}><div className="date-box"><b>{eventDate.getDate()}</b><small>{new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(eventDate).toUpperCase()}</small></div><div><b>{event.title}</b><small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(eventDate)}</small></div><span className={`tag ${event.type === 'Deadline' ? 'orange' : ''}`}>{event.type}</span>{canWrite && <button className="secondary xs" type="button" onClick={() => onEdit(event)}>Edit</button>}{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(event.id)}>Hapus</button>}</div> }) : <p className="muted">Belum ada kegiatan terjadwal.</p>}</div></section></>
}

function Planning({ programs, query, setQuery, onAdd, onDelete, onProgress, canWrite, currentUnit, onUnitFilterChange, unitFilterOptions, onNavigate }) {
  const [showRkaForm, setShowRkaForm] = useState(false)

  return <><PageTitle eyebrow="Siklus kinerja · Tahun Anggaran 2026" title="Perencanaan (E-Usulan Kegiatan)"><div className="title-actions-inline">{canWrite && <Button onClick={onAdd}><Plus size={17}/> E-Usulan Kegiatan</Button>}<button className="secondary" type="button" onClick={() => setShowRkaForm(v => !v)}>{showRkaForm ? 'Tutup form RKA' : 'Input RKA'}</button><label className="filter-select-wrap"><span>Unit</span><select value={currentUnit} onChange={e => onUnitFilterChange(e.target.value)}>{unitFilterOptions.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div></PageTitle>
    <div className="planning-subnav">
      <button type="button" className="primary" onClick={() => onNavigate('usulan-rka')}><ClipboardList size={16}/> Usulan RKA / KAK</button>
      <button type="button" className="primary" onClick={() => onNavigate('upload-pendukung')}><FileUp size={16}/> Upload Dokumen Pendukung</button>
      <button type="button" className="primary" onClick={() => onNavigate('verifikasi-usulan')}><BadgeCheck size={16}/> Verifikasi Usulan</button>
      <button type="button" className="primary" onClick={() => onNavigate('arsip')}><FolderOpen size={16}/> Arsip Renja & DPA</button>
    </div>
    <div className="callout"><div className="callout-icon"><Zap size={19}/></div><div><b>Rencana kerja tahun 2026 sedang berjalan</b><p>Lengkapi indikator dan pagu untuk menjaga konsistensi antara rencana dan realisasi.</p></div><button onClick={() => onNavigate('pengendalian')}>Buka pengendalian →</button></div>{showRkaForm && <RkaForm />}<section className="card table-card"><div className="table-toolbar"><div><h2>Daftar E-Usulan Kegiatan</h2><p>{programs.length} usulan kegiatan terdaftar</p></div><div className="search"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari usulan kegiatan..." /></div></div><ProgramTable programs={programs} canWrite={canWrite} onDelete={onDelete} onProgress={onProgress}/></section></> }

function UsulanRkaPage({ usulanRka, canWrite, onAdd, onUpload, onVerify, onDelete, isPerencanaan, isSuperAdmin }) {
  return <><PageTitle eyebrow="Perencanaan · E-Usulan Kegiatan" title="Usulan RKA / KAK"><div className="title-actions-inline">{canWrite && <Button onClick={onAdd}><Plus size={17}/> Usulan baru</Button>}</div></PageTitle>
    <div className="callout"><div className="callout-icon"><ClipboardList size={19}/></div><div><b>Form penginputan usulan kegiatan tahunan / perubahan</b><p>Setiap Kepala Seksi / PPTK dapat mengajukan usulan RKA atau KAK untuk ditelaah oleh Sub Bagian Perencanaan.</p></div>{canWrite && <button onClick={onAdd}>Buat usulan →</button>}</div>
    <section className="card table-card"><div className="card-head"><div><h2>Daftar usulan RKA / KAK</h2><p>{usulanRka.length} usulan terdaftar</p></div><ClipboardList className="muted-icon"/></div>
      {usulanRka.length ? <div className="table-scroll"><table><thead><tr><th>Usulan</th><th>Bidang</th><th>Jenis / TA</th><th>Pagu</th><th>Dokumen</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{usulanRka.map(item => <tr key={item.id}>
        <td><b>{item.judul}</b><span>{item.penanggung || '-'} · Target: {item.target || '-'}</span>{item.batas_waktu && <small>Batas waktu: {new Date(`${item.batas_waktu}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</small>}</td>
        <td>{item.bidang}</td><td>{item.jenis} · TA {item.tahun_anggaran}</td><td>{rupiah(item.pagu)}</td>
        <td>{(item.dokumen || []).length ? (item.dokumen || []).map(doc => <div className="doc-mini" key={doc.id}><span className={`tag ${doc.jenis_dokumen === 'KAK' ? '' : doc.jenis_dokumen === 'RAB' ? 'orange' : 'blue'}`}>{doc.jenis_dokumen}</span>{doc.file_path ? <a href={doc.file_path} target="_blank" rel="noreferrer">{doc.name}</a> : <span>{doc.name}</span>}</div>) : <small className="muted">Belum ada dokumen</small>}</td>
        <td><span className={`status ${item.status === 'Disetujui' ? 'done' : item.status === 'Menunggu verifikasi' ? 'warn' : ''}`}>{item.status}</span>{item.catatan_verifikator && <small className="muted">{item.catatan_verifikator}</small>}</td>
        <td><div className="row-actions">{canWrite && <button className="secondary xs" type="button" onClick={() => onUpload(item.id)}><FileUp size={14}/> Dokumen</button>}{isPerencanaan && <button className="secondary xs" type="button" onClick={() => onVerify(item.id, 'Disetujui', item.catatan_verifikator || 'Usulan disetujui untuk dilanjutkan ke tahap DPA.')}><Check size={14}/> Setujui</button>}{isPerencanaan && <button className="table-action danger" type="button" onClick={() => onVerify(item.id, 'Perlu perbaikan', 'Mohon lengkapi dokumen KAK, RAB, dan jadwal pelaksanaan.')}>Kembalikan</button>}{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(item.id)}>Hapus</button>}</div></td>
      </tr>)}</tbody></table></div> : <p className="muted">Belum ada usulan. Buat usulan baru untuk memulai.</p>}</section></>
}

function UploadPendukungPage({ usulanRka, canWrite, onUpload, onDelete, isSuperAdmin }) {
  const dokumenList = usulanRka.flatMap(item => (item.dokumen || []).map(doc => ({ ...doc, usulan: item })))
  const jenisCount = jenis => dokumenList.filter(doc => doc.jenis_dokumen === jenis).length
  return <><PageTitle eyebrow="Perencanaan · E-Usulan Kegiatan" title="Upload Dokumen Pendukung"><div className="title-actions-inline"><span className="subtitle">KAK · RAB · Jadwal Pelaksanaan</span></div></PageTitle>
    <div className="stat-grid"><Stat label="Dokumen KAK" value={jenisCount('KAK')} note="Kerangka Acuan Kerja" icon={FileText}/><Stat label="Dokumen RAB" value={jenisCount('RAB')} note="Rincian Anggaran Biaya" icon={FileText} tone="blue"/><Stat label="Jadwal Pelaksanaan" value={jenisCount('Jadwal Pelaksanaan')} note="Timeline kegiatan" icon={CalendarDays} tone="orange"/><Stat label="Usulan terdata" value={usulanRka.length} note="Total usulan RKA/KAK" icon={ClipboardList} tone="purple"/></div>
    <section className="card table-card"><div className="card-head"><div><h2>Unggah dokumen per usulan</h2><p>Pilih usulan lalu unggah KAK, RAB, dan Jadwal Pelaksanaan</p></div><FileUp className="muted-icon"/></div>
      {usulanRka.length ? <div className="download-list">{usulanRka.map(item => <div className="download-row" key={item.id}><div className="file-icon"><ClipboardList size={18}/></div><div><b>{item.judul}</b><small>{item.bidang} · TA {item.tahun_anggaran} · {(item.dokumen || []).length} dokumen terlampir</small></div>{canWrite && <button className="secondary xs" type="button" onClick={() => onUpload(item.id)}><Upload size={14}/> Unggah</button>}{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(item.id)}>Hapus</button>}</div>)}</div> : <p className="muted">Belum ada usulan. Buat usulan terlebih dahulu pada menu Usulan RKA / KAK.</p>}</section>
    <section className="card table-card"><div className="card-head"><div><h2>Dokumen pendukung terunggah</h2><p>{dokumenList.length} dokumen terdaftar</p></div><FileText className="muted-icon"/></div>
      {dokumenList.length ? <div className="download-list">{dokumenList.map(doc => <div className="download-row" key={doc.id}><div className="file-icon"><FileText size={18}/></div><div><b>{doc.name}</b><small>{doc.usulan.judul} · {doc.size}</small></div><span className="tag">{doc.jenis_dokumen}</span>{doc.file_path ? <a className="icon-btn" href={doc.file_path} target="_blank" rel="noreferrer" title="Buka file"><FileDown size={18}/></a> : <span className="muted xs">Tanpa berkas</span>}</div>)}</div> : <p className="muted">Belum ada dokumen pendukung yang diunggah.</p>}</section></>
}

function VerifikasiUsulanPage({ usulanRka, isPerencanaan, onVerify, onDelete, isSuperAdmin }) {
  const menunggu = usulanRka.filter(item => item.status === 'Menunggu verifikasi')
  const diproses = usulanRka.filter(item => item.status !== 'Menunggu verifikasi')
  const handleKeputusan = (item, keputusan) => {
    const catatan = keputusan === 'Disetujui'
      ? 'Usulan disetujui oleh Sub Bagian Perencanaan dan dilanjutkan ke penyusunan DPA.'
      : window.prompt('Tuliskan catatan perbaikan untuk pengusul:') || ''
    if (keputusan !== 'Disetujui' && !catatan.trim()) return
    onVerify(item.id, keputusan, catatan)
  }
  return <><PageTitle eyebrow="Perencanaan · Sub Bagian Perencanaan" title="Verifikasi Usulan"><div className="title-actions-inline"><span className="subtitle">{menunggu.length} usulan menunggu telaah</span></div></PageTitle>
    <div className="callout"><div className="callout-icon"><BadgeCheck size={19}/></div><div><b>Telaah usulan oleh Sub Bagian Perencanaan</b><p>Menelaah, menyetujui, atau mengembalikan usulan beserta catatan perbaikan kepada Kepala Seksi / PPTK.</p></div></div>
    <section className="card table-card"><div className="card-head"><div><h2>Menunggu verifikasi</h2><p>{menunggu.length} usulan perlu ditelaah</p></div><BadgeCheck className="muted-icon"/></div>
      {menunggu.length ? <div className="download-list">{menunggu.map(item => <div className="verification-row" key={item.id}><div><b>{item.judul}</b><small>{item.bidang} · {item.jenis} · TA {item.tahun_anggaran} · {rupiah(item.pagu)}</small><small>{(item.dokumen || []).length} dokumen pendukung · Pengusul: {item.created_by || '-'}</small></div><div className="row-actions"><button className="secondary xs" type="button" onClick={() => handleKeputusan(item, 'Disetujui')}><Check size={14}/> Setujui</button><button className="table-action danger" type="button" onClick={() => handleKeputusan(item, 'Perlu perbaikan')}>Kembalikan dengan catatan</button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(item.id)}>Hapus</button>}</div></div>)}</div> : <p className="muted">Semua usulan sudah diverifikasi.</p>}</section>
    <section className="card table-card"><div className="card-head"><div><h2>Riwayat verifikasi</h2><p>{diproses.length} usulan telah diproses</p></div><ClipboardCheck className="muted-icon"/></div>
      {diproses.length ? <div className="download-list">{diproses.map(item => <div className="verification-row" key={item.id}><div><b>{item.judul}</b><small>{item.bidang} · {rupiah(item.pagu)}</small>{item.catatan_verifikator && <small className="muted">Catatan: {item.catatan_verifikator}</small>}{(item.riwayat || []).length > 0 && <small className="muted">Verifikator terakhir: {(item.riwayat || [])[0].verifikator} · {new Date((item.riwayat || [])[0].at).toLocaleString('id-ID')}</small>}</div><span className={`status ${item.status === 'Disetujui' ? 'done' : ''}`}>{item.status}</span>{item.status === 'Perlu perbaikan' && isPerencanaan && <button className="secondary xs" type="button" onClick={() => handleKeputusan(item, 'Disetujui')}>Setujui sekarang</button>}</div>)}</div> : <p className="muted">Belum ada riwayat verifikasi.</p>}</section></>
}

function RkaForm() {
  const defaultRows = [
    { kode: '5', uraian: 'BELANJA DAERAH', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1', uraian: 'BELANJA OPERASI', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02', uraian: 'Belanja Barang dan Jasa', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01', uraian: 'Belanja Barang', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01.01', uraian: 'Belanja Barang Pakai Habis', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01.01.0026', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '[#]', uraian: 'Belanja Jilid', koefisien: '1', satuan: 'Buah', harga: '44.700', ppn: '', jumlah: '44.700' },
    { kode: '[#]', uraian: 'Belanja Penggandaan', koefisien: '1', satuan: 'Lembar', harga: '300', ppn: '', jumlah: '300' },
    { kode: '5.1.02.01.0052', uraian: 'Belanja Makanan dan Minuman Rapat', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '[#]', uraian: 'Belanja Makan dan Minum Rapat Evaluasi Kinerja PPA & SAPA', koefisien: '19', satuan: 'Orang / Kali', harga: '45.000', ppn: '', jumlah: '855.000' },
  ]

  const [rows, setRows] = useState(defaultRows)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api('/rka').then(data => {
      if (Array.isArray(data.rows) && data.rows.length) {
        setRows(data.rows.map(row => ({
          id: row.id,
          kode: row.kode || '',
          uraian: row.uraian || '',
          koefisien: row.koefisien || '',
          satuan: row.satuan || '',
          harga: row.harga || '',
          ppn: row.ppn || '',
          jumlah: row.jumlah || ''
        })))
      }
    }).catch(() => {})
  }, [])

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row))
  }

  const total = rows.reduce((sum, row) => sum + (Number(row.jumlah) || 0), 0)

  const saveRka = () => {
    setSaving(true)
    api('/rka', { method: 'POST', body: JSON.stringify({
      title: 'Rencana Kerja dan Anggaran',
      tahun: '2025',
      satuan: 'Kecamatan Kedungwaringin',
      formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD',
      rows
    }) }).then(() => {
      setStatus('Data RKA berhasil disimpan ke database lokal.')
    }).catch(err => {
      setStatus(err.message || 'Gagal menyimpan data RKA.')
    }).finally(() => setSaving(false))
  }

  const exportRkaPdf = () => {
    const lines = [
      'SIPERAN KEDUNGWARINGIN',
      'Rencana Kerja dan Anggaran',
      'Tahun: 2025',
      'Satuan: Kecamatan Kedungwaringin',
      'Formulir: RKA MANUAL - RINCIAN BELANJA SKPD',
      '',
      'Detail RKA:'
    ]

    rows.forEach((row, idx) => {
      const label = row.uraian || `Baris ${idx + 1}`
      const amount = Number(row.jumlah) || 0
      lines.push(`${row.kode || '-'} | ${label} | Rp ${new Intl.NumberFormat('id-ID').format(amount)}`)
    })

    lines.push('', `Total Anggaran: Rp ${new Intl.NumberFormat('id-ID').format(total)}`)
    makePdfDownload('RKA-Kedungwaringin', lines)
  }

  return <section className="card rka-card">
    <div className="card-head">
      <div>
        <h2>Input RKA</h2>
        <p>Rencana Kerja dan Anggaran per kegiatan SKPD</p>
      </div>
      <button className="secondary" type="button" onClick={() => setRows(prev => [...prev, { kode: '', uraian: '', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' }])}>Tambah baris</button>
    </div>

    <div className="rka-sheet">
      <table className="rka-table">
        <thead>
          <tr>
            <th colSpan="3" className="rka-title-cell">RENCANA KERJA DAN ANGGARAN<br/>KERJA PERANGKAT DAERAH MANUAL</th>
            <th className="rka-title-cell">SATUAN</th>
            <th className="rka-title-cell" colSpan="3">Formulir<br/>RKA MANUAL - RINCIAN BELANJA SKPD</th>
          </tr>
          <tr>
            <th colSpan="7" className="rka-center">Pemerintah Kabupaten Bekasi Tahun Anggaran 2025</th>
          </tr>
          <tr>
            <th colSpan="7" className="rka-center">Rincian Anggaran Belanja Kegiatan<br/>Satuan Kerja Perangkat Daerah</th>
          </tr>
          <tr>
            <th>Kode Rekening</th>
            <th>Uraian</th>
            <th>Koefisien</th>
            <th>Satuan</th>
            <th>Harga</th>
            <th>PPN</th>
            <th>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || `rka-row-${index}`}>
              <td><input value={row.kode} onChange={e => updateRow(index, 'kode', e.target.value)} /></td>
              <td><input value={row.uraian} onChange={e => updateRow(index, 'uraian', e.target.value)} /></td>
              <td><input value={row.koefisien} onChange={e => updateRow(index, 'koefisien', e.target.value)} /></td>
              <td><input value={row.satuan} onChange={e => updateRow(index, 'satuan', e.target.value)} /></td>
              <td><input value={row.harga} onChange={e => updateRow(index, 'harga', e.target.value)} /></td>
              <td><input value={row.ppn} onChange={e => updateRow(index, 'ppn', e.target.value)} /></td>
              <td><input value={row.jumlah} onChange={e => updateRow(index, 'jumlah', e.target.value)} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6">Jumlah Anggaran Sub Kegiatan</td>
            <td>Rp. {new Intl.NumberFormat('id-ID').format(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div className="rka-actions">
      <button className="primary" type="button" onClick={saveRka} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan RKA'}</button>
      <button className="secondary" type="button" onClick={exportRkaPdf}>Export PDF</button>
    </div>
    {status && <p className="muted" style={{ marginTop: 12 }}>{status}</p>}
  </section>
}
function ProgramTable({ programs, canWrite, onDelete, onProgress }) { return <div className="table-scroll"><table><thead><tr><th>Kode / Program</th><th>Bidang</th><th>Pagu anggaran</th><th>Progress</th><th>Status</th><th>Penanggung jawab</th>{canWrite && <th>Aksi</th>}</tr></thead><tbody>{programs.map(p => <tr key={p.id}><td><b>{p.kode}</b><span>{p.nama}</span></td><td>{p.bidang}</td><td>{rupiah(p.pagu)}</td><td><button type="button" className="progress-cell progress-button" onClick={() => canWrite && onProgress(p)} title={canWrite ? 'Klik untuk mengatur progress' : 'Progress'}><span className="progress"><i style={{width: `${Math.min(100, pct(p.realisasi, p.target))}%`}}/></span><small>{pct(p.realisasi, p.target)}%</small></button></td><td><span className={`status ${p.status === 'Selesai' ? 'done' : p.status === 'Perlu perhatian' ? 'warn' : ''}`}>{p.status}</span></td><td>{p.penanggung}</td>{canWrite && <td><button className="table-action danger" onClick={() => onDelete(p.id)}>Hapus</button></td>}</tr>)}</tbody></table></div> }

function Control({ programs, setPrograms, onUpload, canWrite, notify }) { const [selected, setSelected] = useState(programs[0]?.id); const current = programs.find(p => p.id === selected) || programs[0]; const currentPercent = current && current.target ? Math.min(100, Math.round((current.realisasi / current.target) * 100)) : 0; const usedBudget = current ? Math.min(current.pagu, Math.round((currentPercent / 100) * current.pagu)) : 0; const remainingBudget = current ? Math.max(0, current.pagu - usedBudget) : 0; const updatePercent = (nextPercent) => { if (!canWrite || !current) return; const nextRealisasi = Math.round((nextPercent / 100) * current.target); const nextStatus = nextRealisasi >= current.target ? 'Selesai' : nextPercent >= 75 ? 'Berjalan' : 'Perlu perhatian'; const n = { ...current, realisasi: nextRealisasi, status: nextStatus }; api(`/programs/${current.id}`,{method:'PATCH',body:JSON.stringify(n)}).then(() => { setPrograms(programs.map(p => p.id === current.id ? n : p)); notify(`Realisasi diatur menjadi ${nextPercent}%`) }) }; return <><PageTitle eyebrow="Siklus kinerja · Monitoring berkala" title="Pengendalian & Realisasi">{canWrite && <Button secondary onClick={onUpload}><Upload size={17}/> Unggah bukti realisasi</Button>}</PageTitle><div className="control-layout"><section className="card program-list"><div className="card-head"><div><h2>Pilih program</h2><p>Perbarui capaian fisik secara berkala</p></div></div>{programs.map(p => <button key={p.id} className={`program-option ${selected === p.id ? 'selected' : ''}`} onClick={() => setSelected(p.id)}><div><b>{p.kode}</b><span>{p.nama}</span></div><strong>{pct(p.realisasi, p.target)}%</strong></button>)}</section><section className="card detail-card">{current && <><div className="detail-top"><div><span className="eyebrow">{current.kode} · {current.bidang}</span><h2>{current.nama}</h2><p>Penanggung jawab: {current.penanggung}</p></div><span className={`status ${current.status === 'Perlu perhatian' ? 'warn' : current.status === 'Selesai' ? 'done' : ''}`}>{current.status}</span></div><div className="big-progress"><div className="big-progress-head"><span>Realisasi indikator</span><b>{pct(current.realisasi, current.target)}%</b></div><div className="progress"><i style={{width: `${pct(current.realisasi, current.target)}%`}}/></div><div className="metric-row"><div><small>Realisasi fisik</small><b>{current.realisasi} <em>/ {current.target} target</em></b></div><div><small>Pagu anggaran</small><b>{rupiah(current.pagu)}</b></div><div><small>Batas waktu</small><b>{new Date(current.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</b></div></div><div className="budget-summary"><div><small>Pagu terpakai</small><b>{rupiah(usedBudget)}</b><span>{currentPercent}% dari pagu</span></div><div><small>Sisa pagu</small><b>{rupiah(remainingBudget)}</b><span>{100 - currentPercent}% belum terpakai</span></div></div></div><div className="update-box"><h3>Input realisasi terbaru</h3><p>{canWrite ? 'Pilih tingkat capaian dari 10% sampai 100% untuk melihat progres secara jelas.' : 'Mode baca saja: Anda tidak memiliki izin mengubah realisasi.'}</p>{canWrite && <><div className="step-grid">{[0,10,20,30,40,50,60,70,80,90,100].map(step => <button key={step} className={`step-btn ${currentPercent === step ? 'active' : ''}`} onClick={() => updatePercent(step)}>{step}%</button>)}</div><div className="slider-wrap"><label>Capaian saat ini: <strong>{currentPercent}%</strong></label><input type="range" min="0" max="100" step="10" value={currentPercent} onChange={e => updatePercent(Number(e.target.value))} /></div><div className="quick-actions"><button className="secondary" onClick={() => notify('Bukti realisasi siap diunggah')}>Lampirkan bukti</button></div></>}</div></>}</section></div></> }

const SPJ_STAGES = ['Review Subag Perencanaan & Keuangan', 'Penandatanganan Camat / Sekcam', 'Tahap Pencairan', 'Selesai Dicairkan']
const spjStageClass = s => s === 'Selesai Dicairkan' ? 'done' : s === 'Tahap Pencairan' ? '' : 'warn'

function LkaPage({ programs, spjList }) {
  const rows = programs.map(p => {
    const spj = spjList.filter(s => s.program_id === p.id)
    const cair = spj.reduce((t, s) => t + Number(s.nilai_pencairan || 0), 0)
    return { kode: p.kode, nama: p.nama, bidang: p.bidang, pagu: Number(p.pagu || 0), cair, sisa: Math.max(0, Number(p.pagu || 0) - cair), fisik: pct(p.realisasi, p.target), status: p.status, spjCount: spj.length }
  })
  const totalPagu = rows.reduce((t, r) => t + r.pagu, 0)
  const totalCair = rows.reduce((t, r) => t + r.cair, 0)
  const exportLka = () => makeLkaPdf(rows, { totalPagu, totalCair })
  return <><PageTitle eyebrow="Pengendalian & Realisasi Anggaran · Rekapitulasi" title="Lembar Kendali Anggaran (LKA)"><Button secondary onClick={exportLka}><FileDown size={17}/> Ekspor PDF</Button></PageTitle>
    <div className="stat-grid"><Stat label="Total pagu" value={rupiah(totalPagu)} note={`${rows.length} kegiatan terdaftar`} icon={FileSpreadsheet} /><Stat label="Total realisasi pencairan" value={rupiah(totalCair)} note={totalPagu ? `${Math.round((totalCair / totalPagu) * 100)}% dari pagu` : '-'} icon={Activity} tone="blue" /><Stat label="Sisa anggaran" value={rupiah(Math.max(0, totalPagu - totalCair))} note="Belum dicairkan" icon={Target} tone="orange" /><Stat label="Berkas SPJ" value={spjList.length} note={`${spjList.filter(s => s.status === 'Selesai Dicairkan').length} selesai dicairkan`} icon={ClipboardList} tone="purple" /></div>
    <section className="card table-card"><div className="card-head"><div><h2>Rekapitulasi per rekening belanja / kegiatan</h2><p>Pagu, realisasi pencairan, dan sisa anggaran per kegiatan</p></div><FileSpreadsheet className="muted-icon" /></div>
      {rows.length ? <div className="table-scroll"><table><thead><tr><th>Kode / Kegiatan</th><th>Bidang</th><th>Pagu</th><th>Realisasi Pencairan</th><th>Sisa Anggaran</th><th>% Serap</th><th>Progres Fisik</th><th>Berkas SPJ</th><th>Status</th></tr></thead><tbody>{rows.map(r => <tr key={r.kode}>
        <td><b>{r.kode}</b><span>{r.nama}</span></td><td>{r.bidang}</td><td>{rupiah(r.pagu)}</td><td>{rupiah(r.cair)}</td><td>{rupiah(r.sisa)}</td>
        <td><b>{r.pagu ? Math.round((r.cair / r.pagu) * 100) : 0}%</b></td>
        <td><span className="progress"><i style={{ width: `${Math.min(100, r.fisik)}%` }} /></span></td>
        <td>{r.spjCount} berkas</td>
        <td><span className={`status ${r.status === 'Selesai' ? 'done' : r.status === 'Perlu perhatian' ? 'warn' : ''}`}>{r.status}</span></td>
      </tr>)}</tbody><tfoot><tr><td colSpan={2}><b>TOTAL</b></td><td><b>{rupiah(totalPagu)}</b></td><td><b>{rupiah(totalCair)}</b></td><td><b>{rupiah(Math.max(0, totalPagu - totalCair))}</b></td><td colSpan={4} /></tr></tfoot></table></div>
      : <p className="muted empty-note">Belum ada kegiatan. Tambahkan E-Usulan Kegiatan terlebih dahulu.</p>}
    </section></>
}

function ProgresSpjPage({ spjList, programs, canWrite, isSuperAdmin, onAdd, onUpdate, onDelete, notify }) {
  return <><PageTitle eyebrow="Pengendalian & Realisasi Anggaran · PPTK" title="Input Progres Fisik & Keuangan">{canWrite && <Button onClick={onAdd}><Plus size={17}/> Input SPJ Pencairan</Button>}</PageTitle>
    <div className="callout"><div className="callout-icon"><ClipboardPen size={19} /></div><div><b>Perbarui berkas SPJ dan capaian fisik kegiatan</b><p>PPTK dapat mencatat berkas pencairan (SPJ) beserta persentase progres fisik dan keuangan setiap kegiatan.</p></div></div>
    <section className="card table-card"><div className="card-head"><div><h2>Daftar SPJ & progres</h2><p>{spjList.length} catatan pencairan</p></div><ClipboardPen className="muted-icon" /></div>
      {spjList.length ? <div className="table-scroll"><table><thead><tr><th>Kegiatan</th><th>No. SPJ / Tanggal</th><th>Nilai Pencairan</th><th>Progres Fisik</th><th>Progres Keuangan</th><th>Status</th><th>Berkas</th>{canWrite && <th>Aksi</th>}</tr></thead><tbody>{spjList.map(s => <tr key={s.id}>
        <td><b>{s.kode_kegiatan || '—'}</b><span>{s.nama_kegiatan}</span></td>
        <td>{s.no_spj || '—'}{s.tanggal_spj && <small>{new Date(`${s.tanggal_spj}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</small>}</td>
        <td>{rupiah(s.nilai_pencairan)}</td>
        <td><span className="progress"><i style={{ width: `${Math.min(100, s.progres_fisik)}%` }} /></span><small>{s.progres_fisik}%</small></td>
        <td><span className="progress"><i style={{ width: `${Math.min(100, s.progres_keuangan)}%` }} /></span><small>{s.progres_keuangan}%</small></td>
        <td><span className={`status ${spjStageClass(s.status)}`}>{s.status}</span></td>
        <td>{s.file_path ? <a href={s.file_path} target="_blank" rel="noreferrer">{s.file_name}</a> : <small className="muted">Tidak ada</small>}</td>
        {canWrite && <td className="table-actions-cell"><button className="table-action" onClick={() => onUpdate(s)}>Update</button>{isSuperAdmin && <button className="table-action danger" onClick={() => onDelete(s.id)}>Hapus</button>}</td>}
      </tr>)}</tbody></table></div>
      : <p className="muted empty-note">Belum ada catatan SPJ. Klik "Input SPJ Pencairan" untuk menambahkan.</p>}
    </section></>
}

function StatusSpjPage({ spjList, canWrite, onAdvance, notify }) {
  const [filter, setFilter] = useState('Semua')
  const filtered = filter === 'Semua' ? spjList : spjList.filter(s => s.status === filter)
  const countBy = stage => spjList.filter(s => s.status === stage).length
  return <><PageTitle eyebrow="Pengendalian & Realisasi Anggaran · Pelacakan" title="Status Verifikasi SPJ">
    <label className="filter-select-wrap"><span>Tahap</span><select value={filter} onChange={e => setFilter(e.target.value)}><option>Semua</option>{SPJ_STAGES.map(s => <option key={s}>{s}</option>)}</select></label></PageTitle>
    <div className="stat-grid"><Stat label="Review Subag Perencanaan & Keuangan" value={countBy(SPJ_STAGES[0])} note="Dokumen sedang direview" icon={ClipboardList} tone="blue" /><Stat label="Penandatanganan Camat / Sekcam" value={countBy(SPJ_STAGES[1])} note="Menunggu tanda tangan" icon={ClipboardPen} tone="orange" /><Stat label="Tahap Pencairan" value={countBy(SPJ_STAGES[2])} note="Diproses bendahara" icon={Activity} tone="purple" /><Stat label="Selesai Dicairkan" value={countBy(SPJ_STAGES[3])} note="Dana telah diterima" icon={Check} /></div>
    {filtered.length ? filtered.map(s => <section className="card spj-track-card" key={s.id}>
      <div className="detail-top"><div><span className="eyebrow">{s.kode_kegiatan || 'SPJ'}</span><h2>{s.nama_kegiatan}</h2><p>Nilai pencairan: <b>{rupiah(s.nilai_pencairan)}</b>{s.no_spj && ` · No. SPJ: ${s.no_spj}`}</p></div><span className={`status ${spjStageClass(s.status)}`}>{s.status}</span></div>
      <ol className="spj-steps">{SPJ_STAGES.map((stage, i) => {
        const currentIdx = SPJ_STAGES.indexOf(s.status)
        const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : ''
        return <li key={stage} className={state}><b>{stage}</b>{i === currentIdx && canWrite && i < SPJ_STAGES.length - 1 && <button className="table-action" onClick={() => onAdvance(s, SPJ_STAGES[i + 1])}>Lanjut ke tahap berikutnya →</button>}</li>
      })}</ol>
      {s.riwayat && s.riwayat.length > 0 && <div className="spj-history"><h3>Riwayat</h3>{s.riwayat.map(h => <div className="spj-history-item" key={h.id}><span className={`status ${h.status === 'Selesai Dicairkan' ? 'done' : 'warn'}`}>{h.status}</span><div><b>{h.catatan || 'Perubahan status'}</b><small>{h.oleh || 'Sistem'} · {new Date(h.at).toLocaleString('id-ID')}</small></div></div>)}</div>}
    </section>) : <p className="muted empty-note">Tidak ada SPJ pada tahap ini.</p>}</>
}

function Evaluation({ programs, docs, approvalBoard, onUpload, onVerify, onDelete, onApprove, canWrite, isSuperAdmin }) {
  const [selectedDoc, setSelectedDoc] = useState(null)

  const downloadDoc = doc => {
    if (doc.file_path) {
      const url = `${doc.file_path}`
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    const reviewLines = (doc.review_log || []).slice(0, 4).map(log => `${log.action} — ${log.reviewer} (${new Date(log.at).toLocaleString('id-ID')})`)
    makePdfDownload(doc.name, [
      'SIPERAN KEDUNGWARINGIN',
      `Dokumen: ${doc.name}`,
      `Jenis: ${doc.type}`,
      `Status: ${doc.status}`,
      `Tanggal: ${doc.date}`,
      '',
      doc.preview || 'Dokumen siap ditinjau.',
      '',
      'Riwayat review:',
      ...reviewLines,
    ])
  }

  return <><PageTitle eyebrow="Siklus kinerja · Akuntabilitas" title="Evaluasi & Pelaporan">{canWrite && <Button onClick={onUpload}><Upload size={17}/> Unggah laporan</Button>}</PageTitle>
    <div className="eval-stats"><div className="card eval-score"><span className="eyebrow">Nilai kinerja sementara</span><strong>82,6</strong><span className="score-up">▲ 4,2 poin dari semester lalu</span><div className="score-track"><i style={{width:'82.6%'}}/></div><small>Baik · Berdasarkan 4 program dan 12 indikator</small></div><div className="card"><div className="card-head"><div><h2>Kepatuhan pelaporan</h2><p>Status dokumen tahun berjalan</p></div><ClipboardCheck className="muted-icon"/></div><div className="compliance"><div><b>75%</b><span>Tepat waktu</span></div><div><b>2/3</b><span>Terverifikasi</span></div><div><b>0</b><span>Ditolak</span></div></div></div></div>
    {canWrite && <section className="card approval-card"><div className="card-head"><div><h2>Persetujuan per seksi / subbag</h2><p>Hanya Admin dan Super Admin yang dapat menyetujui atau menolak.</p></div><ShieldCheck className="muted-icon"/></div><div className="approval-list">{approvalBoard.map(item => <div className="approval-row" key={item.section}><div className="approval-text"><b>{item.section}</b><small>{item.notes || 'Belum ada catatan'}</small></div><span className={`status ${item.status === 'Disetujui' ? 'done' : 'warn'}`}>{item.status}</span><div className="approval-actions"><button className="secondary xs" type="button" onClick={() => onApprove(item.section, 'Disetujui')}>Setujui</button><button className="table-action danger" type="button" onClick={() => onApprove(item.section, 'Ditolak')}>Tolak</button></div></div>)}</div></section>}
    <section className="card review-card"><div className="card-head"><div><h2>Dokumen yang diunggah</h2><p>Daftar berkas terbaru untuk ditinjau dan diverifikasi</p></div><FileText className="muted-icon"/></div><div className="review-list">{docs.map(d => <div className="review-item" key={d.id}><div className="file-name"><div className="file-icon"><FileText size={16}/></div><div><b>{d.name}</b><small>{d.type} · {d.size} · {d.date}</small></div></div><div className="review-meta"><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span></div><div className="review-actions"><button className="secondary xs" type="button" onClick={() => setSelectedDoc(d)}>Lihat</button>{canWrite && d.status !== 'Terverifikasi' && <button className="table-action" type="button" onClick={() => onVerify(d.id)}><Check size={15}/> Review</button>}<button className="secondary xs" type="button" onClick={() => downloadDoc(d)}><FileDown size={15}/> Unduh</button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(d.id)}>Hapus</button>}</div></div>)}</div></section>
    <section className="card table-card"><div className="card-head"><div><h2>Dokumen pelaporan</h2><p>Kelola dokumen dan status verifikasi</p></div><FileText className="muted-icon"/></div><div className="table-scroll"><table><thead><tr><th>Nama dokumen</th><th>Jenis</th><th>Ukuran</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{docs.map(d => <tr key={d.id}><td><div className="file-name"><div className="file-icon"><FileText size={16}/></div><b>{d.name}</b></div></td><td>{d.type}</td><td>{d.size}</td><td>{d.date}</td><td><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span></td><td><div className="row-actions">{canWrite && d.status !== 'Terverifikasi' && <button className="table-action" onClick={() => onVerify(d.id)}><Check size={15}/> Verifikasi</button>}<button className="secondary xs" type="button" onClick={() => setSelectedDoc(d)}>Lihat</button><button className="secondary xs" type="button" onClick={() => downloadDoc(d)}><FileDown size={15}/> Unduh</button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(d.id)}>Hapus</button>}</div></td></tr>)}</tbody></table></div></section>
    {selectedDoc && <Modal title="Preview dokumen" onClose={() => setSelectedDoc(null)}><div className="doc-preview"><div className="preview-badge">{selectedDoc.status}</div><h3>{selectedDoc.name}</h3><div className="doc-meta"><span><b>Jenis:</b> {selectedDoc.type}</span><span><b>Ukuran:</b> {selectedDoc.size}</span><span><b>Tanggal:</b> {selectedDoc.date}</span></div><p>{selectedDoc.preview || 'Dokumen ini sedang dipantau dalam proses evaluasi dan pelaporan. Silakan tinjau kelengkapan, kesesuaian data, dan status verifikasi sebelum ditutup atau disetujui.'}</p>{(selectedDoc.review_log || []).length > 0 && <div className="review-log"><h4>Riwayat review</h4>{(selectedDoc.review_log || []).map(log => <div className="log-entry" key={log.id}><b>{log.action}</b><small>{log.reviewer} · {new Date(log.at).toLocaleString('id-ID')}</small><p>{log.notes}</p></div>)}</div>}<div className="review-actions modal-actions"><button className="secondary" type="button" onClick={() => setSelectedDoc(null)}>Tutup</button><button className="secondary" type="button" onClick={() => downloadDoc(selectedDoc)}>Unduh file</button>{canWrite && selectedDoc.status !== 'Terverifikasi' && <button className="primary" type="button" onClick={() => { onVerify(selectedDoc.id); setSelectedDoc(null) }}><Check size={15}/> Review dokumen</button>}</div></div></Modal>}
  </>
}

function makeLkaPdf(rows, totals) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(13)
  pdf.text('LEMBAR KENDALI ANGGARAN (LKA)', pageWidth / 2, 14, { align: 'center' })
  pdf.setFontSize(10); pdf.setFont('helvetica', 'normal')
  pdf.text('Kecamatan Kedungwaringin · Pengendalian & Realisasi Anggaran', pageWidth / 2, 20, { align: 'center' })
  pdf.text(`Dicetak: ${formatDate(new Date())}`, pageWidth / 2, 25, { align: 'center' })
  const headers = ['Kode', 'Kegiatan', 'Pagu', 'Pencairan', 'Sisa', '% Serap', 'Fisik', 'SPJ']
  const widths = [20, 82, 34, 34, 34, 16, 16, 14]
  const startX = 10
  let y = 34
  const drawHead = () => {
    pdf.setFillColor(13, 107, 88); pdf.setTextColor(255)
    let x = startX
    pdf.rect(startX, y - 5, widths.reduce((a, b) => a + b, 0), 7, 'F')
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold')
    headers.forEach((h, i) => { pdf.text(h, x + 2, y); x += widths[i] })
    y += 7
  }
  drawHead()
  pdf.setTextColor(40); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8)
  const fmt = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0))
  rows.forEach((r, idx) => {
    if (y > 195) { pdf.addPage(); y = 20; drawHead(); pdf.setTextColor(40); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8) }
    if (idx % 2 === 1) { pdf.setFillColor(240, 247, 244); pdf.rect(startX, y - 4.5, widths.reduce((a, b) => a + b, 0), 6, 'F') }
    let x = startX
    const cells = [r.kode, r.nama, fmt(r.pagu), fmt(r.cair), fmt(r.sisa), `${r.pagu ? Math.round((r.cair / r.pagu) * 100) : 0}%`, `${r.fisik}%`, `${r.spjCount}`]
    cells.forEach((c, i) => {
      const text = pdf.splitTextToSize(String(c), widths[i] - 4)
      pdf.text(text[0], x + 2, y)
      x += widths[i]
    })
    pdf.setDrawColor(210)
    pdf.line(startX, y + 2, startX + widths.reduce((a, b) => a + b, 0), y + 2)
    y += 6
  })
  if (y > 190) { pdf.addPage(); y = 20 }
  y += 4
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9)
  pdf.text('TOTAL', startX + 2, y)
  pdf.text(fmt(totals.totalPagu), startX + widths[0] + widths[1] + 2, y)
  pdf.text(fmt(totals.totalCair), startX + widths[0] + widths[1] + widths[2] + 2, y)
  pdf.text(fmt(Math.max(0, totals.totalPagu - totals.totalCair)), startX + widths[0] + widths[1] + widths[2] + widths[3] + 2, y)
  pdf.save(`LKA-Kecamatan-Kedungwaringin-${new Date().toISOString().slice(0, 10)}.pdf`)
}

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
function makeRkaTemplatePdf() {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const left = 10
  const right = pageWidth - 10
  const widths = [32, 102, 28, 28, 28, 20, 39]
  const headers = ['Kode Rekening', 'Uraian', 'Koefisien', 'Satuan', 'Harga', 'PPN', 'Jumlah']
  const rows = [
    ['5', 'BELANJA DAERAH', '', '', '', '', 'Rp.'],
    ['5.1', 'BELANJA OPERASI', '', '', '', '', 'Rp.'],
    ['5.1.02', 'Belanja Barang dan Jasa', '', '', '', '', 'Rp.'],
    ['5.1.02.01', 'Belanja Barang', '', '', '', '', 'Rp.'],
    ['5.1.02.01.01', 'Belanja Barang Pakai Habis', '', '', '', '', 'Rp.'],
    ['5.1.02.01.01.0026', 'Belanja Alat/Bahan untuk Kegiatan Kantor - Bahan Cetak', '', '', '', '', 'Rp.'],
    ['[#]', 'Belanja Jilid\nSumber Dana: PENDAPATAN ASLI DAERAH (PAD)', '1', 'Buku', '', '', 'Rp.'],
    ['[#]', 'Belanja Penggandaan\nSumber Dana: PENDAPATAN ASLI DAERAH (PAD)', '1', 'Lembar', '', '', 'Rp.'],
    ['5.1.02.01.0052', 'Belanja Makanan dan Minuman Rapat', '', '', '', '', 'Rp.'],
    ['[#]', 'Belanja Makan dan Minum Rapat Evaluasi Kinerja PPA & SAPA', '1', 'Orang / Kali', '', '', 'Rp.'],
  ]
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('RENCANA KERJA DAN ANGGARAN SATUAN KERJA PERANGKAT DAERAH', pageWidth / 2, 13, { align: 'center' })
  pdf.text('MANUAL', pageWidth / 2, 19, { align: 'center' })
  pdf.text('Formulir', right - 55, 13, { align: 'center' })
  pdf.text('RKA MANUAL - RINCIAN BELANJA SKPD', right - 55, 19, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.text('Pemerintah Kabupaten Bekasi Tahun Anggaran 2025', pageWidth / 2, 28, { align: 'center' })
  pdf.text('Rincian Anggaran Belanja Kegiatan', pageWidth / 2, 40, { align: 'center' })
  pdf.text('Satuan Kerja Perangkat Daerah', pageWidth / 2, 46, { align: 'center' })

  let y = 54
  const drawRow = (cells, height, bold = false) => {
    let x = left
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(8)
    cells.forEach((cell, index) => {
      pdf.rect(x, y, widths[index], height)
      const lines = String(cell).split('\n')
      lines.forEach((line, lineIndex) => pdf.text(line, x + 2, y + 5 + lineIndex * 4))
      x += widths[index]
    })
    y += height
  }
  drawRow(headers, 9, true)
  rows.forEach(row => drawRow(row, row[1].includes('\n') ? 13 : 9, row[0].length < 8 && !row[0].includes('#')))
  drawRow(['', '', '', '', '', 'Jumlah Anggaran Sub Kegiatan', 'Rp.'], 10, true)
  pdf.save('Template-RKA-Manual-Kedungwaringin.pdf')
}
function Downloads({ docs, onUpload, onDelete, canWrite, isSuperAdmin }) { const download = d => { if (d.file_path) { window.open(d.file_path, '_blank', 'noopener,noreferrer'); return; } makePdfDownload(d.name, ['SIPERAN KEDUNGWARINGIN', `Dokumen: ${d.name}`, `Jenis: ${d.type}`, `Status: ${d.status}`, `Tanggal: ${d.date}`]); }; const downloadTemplate = () => makeRkaTemplatePdf(); return <><PageTitle eyebrow="Pusat dokumen" title="Pusat Unduhan">{canWrite && <Button onClick={onUpload}><Upload size={17}/> Tambah dokumen</Button>}</PageTitle><div className="download-banner"><div className="download-art"><CloudDownload size={32}/></div><div><h2>Semua dokumen kerja, terorganisir</h2><p>Unduh template RKA manual dalam format PDF sesuai format rincian belanja SKPD.</p></div><Button secondary onClick={downloadTemplate}>Unduh template PDF</Button></div><section className="card table-card"><div className="table-toolbar"><div><h2>Dokumen tersedia</h2><p>Semua file dapat dibuka langsung atau diunduh sesuai kebutuhan</p></div><div className="search"><Search size={17}/><input placeholder="Cari dokumen..." /></div></div><div className="download-list">{docs.map(d => <div className="download-row" key={d.id}><div className="file-icon"><FileText size={18}/></div><div><b>{d.name}</b><small>{d.type} · {d.size} · {d.date}</small></div><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span><button className="icon-btn" title={d.file_path ? 'Buka file' : 'Unduh PDF'} onClick={() => download(d)}><FileDown size={18}/></button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(d.id)}>Hapus</button>}</div>)}</div></section></> }
function PlanningArchive({ docs, onUpload, onDelete, canWrite, isSuperAdmin }) {
  const categories = ['Semua Arsip', 'Renstra', 'Renja', 'DPA', 'RAK']
  const [category, setCategory] = useState('Semua Arsip')
  const archiveDocs = docs.filter(doc => category === 'Semua Arsip' ? ['Renstra', 'Renja', 'DPA', 'RAK'].includes(doc.type) : doc.type === category)
  const download = doc => doc.file_path
    ? window.open(doc.file_path, '_blank', 'noopener,noreferrer')
    : makePdfDownload(doc.name, ['SIPERAN KEDUNGWARINGIN', `Arsip ${doc.type}`, `Dokumen: ${doc.name}`, `Status: ${doc.status}`])
  return <><PageTitle eyebrow="Bank data perencanaan" title="Arsip Renja & DPA">{canWrite && <Button onClick={onUpload}><Upload size={17}/> Unggah arsip</Button>}</PageTitle>
    <div className="callout"><div className="callout-icon"><FolderOpen size={19}/></div><div><b>Arsip dokumen perencanaan Kecamatan Kedungwaringin</b><p>Renstra, Renja, DPA, dan RAK tersusun dalam kategori khusus agar mudah dipantau.</p></div></div>
    <div className="archive-tabs">{categories.map(item => <button type="button" key={item} className={category === item ? 'primary' : 'secondary'} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <section className="card table-card"><div className="card-head"><div><h2>{category}</h2><p>{archiveDocs.length} dokumen tersedia</p></div><FolderOpen className="muted-icon"/></div><div className="download-list">{archiveDocs.length ? archiveDocs.map(doc => <div className="download-row" key={doc.id}><div className="file-icon"><FileText size={18}/></div><div><b>{doc.name}</b><small>{doc.type} · {doc.size} · {doc.date}</small></div><span className={`status ${doc.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{doc.status}</span><button className="icon-btn" title="Buka arsip" onClick={() => download(doc)}><FileDown size={18}/></button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(doc.id)}>Hapus</button>}</div>) : <p className="muted">Belum ada dokumen pada kategori ini. Unggah dokumen dan pilih jenis arsipnya.</p>}</div></section>
  </>
}
function Settings({ currentUser, users, setUsers, authLog, adminContacts, setAdminContacts, notify }) {
  const [form, setForm] = useState({ type: 'whatsapp', value: '' })
  const [editingId, setEditingId] = useState(null)
  const [resetModalUser, setResetModalUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')

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

  function updateUserRole(user, newRole) {
    if (user.id === currentUser.id && newRole !== 'Super Admin') {
      notify('Anda tidak dapat menurunkan role akun sendiri.')
      return
    }
    api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ role: newRole }) })
      .then(updated => {
        setUsers(list => list.map(u => u.id === user.id ? { ...u, role: updated.role } : u))
        notify(`Role ${user.name} diubah menjadi ${newRole}`)
      })
      .catch(err => notify(err.message || 'Gagal mengubah role'))
  }

  function toggleUserStatus(user) {
    if (user.id === currentUser.id) {
      notify('Anda tidak dapat menonaktifkan akun sendiri.')
      return
    }
    const nextStatus = user.status === 'Nonaktif' ? 'Aktif' : 'Nonaktif'
    api(`/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) })
      .then(updated => {
        setUsers(list => list.map(u => u.id === user.id ? { ...u, status: updated.status } : u))
        notify(`Status ${user.name} diubah menjadi ${nextStatus}`)
      })
      .catch(err => notify(err.message || 'Gagal mengubah status'))
  }

  function handleResetPassword(e) {
    e.preventDefault()
    if (!resetModalUser || !newPassword) return
    if (newPassword.length < 6) {
      notify('Password minimal 6 karakter.')
      return
    }
    api(`/users/${resetModalUser.id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPassword })
    })
      .then(res => {
        notify(res.message || 'Password berhasil direset')
        setResetModalUser(null)
        setNewPassword('')
      })
      .catch(err => notify(err.message || 'Gagal mereset password'))
  }

  function deleteUser(user) {
    if (user.id === currentUser.id) {
      notify('Anda tidak dapat menghapus akun Anda sendiri.')
      return
    }
    if (!window.confirm(`Yakin ingin menghapus akun pengguna "${user.name}" (${user.username})?`)) return
    api(`/users/${user.id}`, { method: 'DELETE' })
      .then(() => {
        setUsers(list => list.filter(u => u.id !== user.id))
        notify(`Akun ${user.name} berhasil dihapus`)
      })
      .catch(err => notify(err.message || 'Gagal menghapus pengguna'))
  }

  return (
    <>
      <PageTitle eyebrow="Konfigurasi sistem" title="Pengaturan & Bantuan" />
      <div className="settings-grid">
        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Profil & akses</h2>
              <p>Akun dan kewenangan yang sedang digunakan.</p>
            </div>
            <Users className="muted-icon" />
          </div>
          <div className="permission">
            <ShieldCheck size={18} />
            <div>
              <b>{currentUser.name}</b>
              <small>{currentUser.username} · {currentUser.role} · {currentUser.bidang || 'Kecamatan Kedungwaringin'}</small>
            </div>
          </div>
          <p className="muted">Data akun dan sesi tersimpan pada database lokal perangkat ini.</p>
        </section>

        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Kontak admin</h2>
              <p>Hubungi admin SIPERAN untuk bantuan dan koordinasi.</p>
            </div>
            <CircleHelp className="muted-icon" />
          </div>
          <div className="contact-list">
            {adminContacts.map(contact => (
              <a
                key={contact.id}
                href={contact.type === 'whatsapp' ? `https://wa.me/${contact.value.replace(/\D/g, '').replace(/^0/, '62')}` : `mailto:${contact.value}`}
                target={contact.type === 'whatsapp' ? '_blank' : undefined}
                rel={contact.type === 'whatsapp' ? 'noreferrer' : undefined}
              >
                {contact.type === 'whatsapp' ? 'WhatsApp:' : 'Email:'} {contact.value}
              </a>
            ))}
          </div>
        </section>

        {currentUser.role === 'Super Admin' && (
          <section className="card settings-card">
            <div className="card-head">
              <div>
                <h2>Kelola kontak admin</h2>
                <p>Hanya Super Admin yang dapat menambah, memperbarui, atau menghapus kontak.</p>
              </div>
              <ShieldCheck className="muted-icon" />
            </div>
            <form className="form-grid" onSubmit={submitContact}>
              <label>
                Tipe kontak
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </label>
              <label>
                Nilai kontak
                <input
                  value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === 'whatsapp' ? 'Contoh: 085771076965' : 'Contoh: admin@domain.go.id'}
                />
              </label>
              <div className="action-row">
                <button className="primary" type="submit">
                  {editingId ? 'Simpan perubahan' : 'Tambah kontak'}
                </button>
                {editingId && (
                  <button className="secondary" type="button" onClick={resetForm}>
                    Batal
                  </button>
                )}
              </div>
            </form>
            <div className="contact-list compact">
              {adminContacts.map(contact => (
                <div className="mini-contact" key={contact.id}>
                  <span>{contact.type === 'whatsapp' ? 'WhatsApp' : 'Email'}</span>
                  <strong>{contact.value}</strong>
                  <div className="mini-contact-actions">
                    <button type="button" className="secondary" onClick={() => editContact(contact)}>Edit</button>
                    <button type="button" className="danger" onClick={() => deleteContact(contact.id)}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {currentUser.role === 'Super Admin' && (
          <section className="card settings-card user-management-card">
            <div className="card-head">
              <div>
                <h2>Manajemen Pengguna (Maintenance)</h2>
                <p>{(users || []).length} akun terdaftar · {authLog.length} riwayat aktivitas autentikasi</p>
              </div>
              <Users className="muted-icon" />
            </div>
            <div className="user-management-list">
              {(users || []).map(user => (
                <div className="user-manage-row" key={user.id}>
                  <div className="user-info-col">
                    <div className="user-name-line">
                      <b>{user.name}</b>
                      <span className={`status ${user.status === 'Nonaktif' ? 'warn' : 'done'}`}>
                        {user.status || 'Aktif'}
                      </span>
                    </div>
                    <small className="muted">
                      Username: <strong>{user.username}</strong>
                      {user.email ? ` · Email: ${user.email}` : ''}
                    </small>
                    <small className="muted">
                      Unit: {user.bidang || '-'} · Login terakhir:{' '}
                      {user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : 'Belum pernah'}
                    </small>
                  </div>

                  <div className="user-actions-col">
                    <div className="role-selector-wrap">
                      <select
                        value={user.role}
                        disabled={user.id === currentUser.id}
                        onChange={e => updateUserRole(user, e.target.value)}
                        className="role-select-inline"
                        title="Ubah Role Pengguna"
                      >
                        <option value="User">User</option>
                        <option value="Admin">Admin</option>
                        <option value="Super Admin">Super Admin</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className={`secondary xs ${user.status === 'Nonaktif' ? 'btn-activate' : 'btn-deactivate'}`}
                      disabled={user.id === currentUser.id}
                      onClick={() => toggleUserStatus(user)}
                      title={user.status === 'Nonaktif' ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                    >
                      {user.status === 'Nonaktif' ? 'Aktifkan' : 'Nonaktifkan'}
                    </button>

                    <button
                      type="button"
                      className="secondary xs"
                      onClick={() => { setResetModalUser(user); setNewPassword(''); }}
                      title="Reset Password Akun"
                    >
                      <KeyRound size={13} /> Reset Pass
                    </button>

                    {user.id !== currentUser.id && (
                      <button
                        type="button"
                        className="danger xs"
                        onClick={() => deleteUser(user)}
                        title="Hapus Akun Pengguna"
                      >
                        <Trash2 size={13} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="card settings-card">
          <div className="card-head">
            <div>
              <h2>Panduan singkat</h2>
              <p>Alur kerja SIPERAN yang direkomendasikan</p>
            </div>
            <CircleHelp className="muted-icon" />
          </div>
          <ol className="guide">
            <li><b>Rencanakan</b><span>Tambahkan program, indikator, dan pagu anggaran.</span></li>
            <li><b>Kendalikan</b><span>Perbarui realisasi fisik & keuangan, lalu lampirkan bukti.</span></li>
            <li><b>Evaluasi</b><span>Verifikasi dokumen berkala dan unduh laporan kinerja.</span></li>
          </ol>
        </section>
      </div>

      {resetModalUser && (
        <Modal title={`Reset Password: ${resetModalUser.name} (${resetModalUser.username})`} onClose={() => setResetModalUser(null)}>
          <form className="form-grid" onSubmit={handleResetPassword}>
            <p className="muted">
              Masukkan password baru untuk pengguna <b>{resetModalUser.username}</b>. Minimal 6 karakter.
            </p>
            <label>
              Password Baru
              <input
                required
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                autoComplete="new-password"
                minLength={6}
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setResetModalUser(null)}>
                Batal
              </button>
              <button type="submit" className="primary">
                Simpan Password Baru
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
function Modal({ title, onClose, children }) { return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose}><X size={19}/></button></div>{children}</div></div> }

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Elemen #root tidak ditemukan.')

const globalRoot = window.__SIPERAN_ROOT__ || (window.__SIPERAN_ROOT__ = createRoot(rootElement))
globalRoot.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
