import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Upload } from 'lucide-react'
import Modal from '../components/Modal'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { bidangOptions, defaultAdminContacts, defaultApprovalBoard } from '../constants'
// bidangOptions passed to EvaluationReports for unit filtering
import { api } from '../services/api'
import { createDocPreview, formatFileSize, pct } from '../utils/format'
import CalendarPage from '../views/CalendarPage'
import Control from '../views/Control'
import Dashboard from '../views/Dashboard'
import Downloads from '../views/Downloads'
import Evaluation from '../views/Evaluation'
import Login from '../views/Login'
import Planning from '../views/Planning'
import PlanningArchive from '../views/PlanningArchive'
import Settings from '../views/Settings'
import UploadPendukungPage from '../views/UploadPendukungPage'
import UsulanRkaPage from '../views/UsulanRkaPage'
import VerifikasiUsulanPage from '../views/VerifikasiUsulanPage'

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
    Promise.all([api('/programs'), api('/docs'), api('/monthly-reports'), api('/events'), api('/log'), api('/users'), api('/admin-contacts'), api('/section-approvals'), api('/usulan-rka')]).then(([p,d,r,e,l,u,c,a,ur]) => { setPrograms(p); setDocs(d); setReports(r); setEvents(e); setAuthLog(l); setUsers(u); setAdminContacts(c.length ? c : defaultAdminContacts); setApprovalBoard(a.length ? a : defaultApprovalBoard); setUsulanRka(ur) }).catch(() => notify('Gagal memuat data server'))
  }, [currentUser])
  useEffect(() => {
    if (!currentUser) return
    const refreshEvents = () => api('/events').then(setEvents).catch(() => {})
    const timer = setInterval(refreshEvents, 5000)
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
    <Sidebar sidebar={sidebar} setSidebar={setSidebar} active={active} setActive={setActive} adminContacts={adminContacts} currentUser={currentUser} signOut={signOut} />
    <main className="main">
      <Navbar setSidebar={setSidebar} active={active} setActive={setActive} currentUser={currentUser} theme={theme} setTheme={setTheme} notificationsOpen={notificationsOpen} setNotificationsOpen={setNotificationsOpen} notificationCount={notificationCount} notifications={notifications} />
      <div className="content">
        {active === 'dashboard' && <Dashboard programs={filtered} docs={docs} events={events} overall={overall} totalPagu={totalPagu} totalRealisasi={totalRealisasi} onNavigate={setActive} currentUnit={unitFilter} onUnitFilterChange={setUnitFilter} unitFilterOptions={unitFilterOptions} />}
        {active === 'kalender' && <CalendarPage events={events} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} onAdd={() => setModal('event')} onEdit={event => setModal({ type: 'edit-event', event })} onDelete={deleteEvent} />}
        {active === 'perencanaan' && <Planning programs={filtered} query={query} setQuery={setQuery} onAdd={() => setModal('program')} onDelete={removeProgram} onProgress={openProgressEditor} canWrite={canWrite} currentUnit={unitFilter} onUnitFilterChange={setUnitFilter} unitFilterOptions={unitFilterOptions} onNavigate={setActive} />}
        {active === 'usulan-rka' && <UsulanRkaPage usulanRka={usulanRka} canWrite={canWrite} onAdd={() => setModal('usulan-rka')} onUpload={id => setModal({ type: 'upload-pendukung', usulanId: id })} onVerify={verifyUsulan} onDelete={deleteUsulan} isPerencanaan={isPerencanaan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'upload-pendukung' && <UploadPendukungPage usulanRka={usulanRka} canWrite={canWrite} onUpload={id => setModal({ type: 'upload-pendukung', usulanId: id })} onDelete={deleteUsulan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'verifikasi-usulan' && <VerifikasiUsulanPage usulanRka={usulanRka} isPerencanaan={isPerencanaan} onVerify={verifyUsulan} onDelete={deleteUsulan} isSuperAdmin={currentUser.role === 'Super Admin'} />}
        {active === 'pengendalian' && <Control programs={programs} setPrograms={setPrograms} onUpload={() => setModal('doc')} canWrite={canWrite} notify={notify} />}
        {active === 'evaluasi' && <Evaluation programs={programs} docs={docs} approvalBoard={approvalBoard} onUpload={() => setModal('report')} onVerify={verifyDoc} onDelete={deleteDoc} onApprove={approveSection} canWrite={canWrite} isSuperAdmin={currentUser.role === 'Super Admin'} bidangOptions={bidangOptions} notify={notify} />}
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
    {modal === 'report' && canWrite && <Modal title="Unggah laporan triwulan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addDoc}><label>Periode laporan<select required name="periode"><option value="">Pilih periode</option><option>Triwulan I</option><option>Triwulan II</option><option>Triwulan III</option></select></label><label className="upload-field">Pilih berkas<input required name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><input type="hidden" name="type" value="Pelaporan" /><p className="muted">Unggah laporan untuk periode Triwulan I, II, atau III. Maksimal 10 MB.</p><button className="primary full" type="submit"><Upload size={17}/> Unggah laporan</button></form></Modal>}
    {modal === 'event' && canWrite && <Modal title="Tambah kegiatan" onClose={() => setModal(null)}><form className="form-grid" onSubmit={addEvent}><label className="full">Nama kegiatan<input required name="title" placeholder="Contoh: Rapat koordinasi bulanan" /></label><label>Tanggal<input required name="date" type="date" /></label><label>Jenis kegiatan<select name="type"><option>Rapat</option><option>Deadline</option><option>Monitoring</option><option>Evaluasi</option><option>Lainnya</option></select></label><button className="primary full" type="submit"><Plus size={17}/> Simpan kegiatan</button></form></Modal>}
    {modal?.type === 'edit-event' && canWrite && <Modal title="Edit kegiatan agenda" onClose={() => setModal(null)}><form className="form-grid" onSubmit={updateEvent}><label className="full">Nama kegiatan<input required name="title" defaultValue={modal.event.title} /></label><label>Tanggal<input required name="date" type="date" defaultValue={modal.event.date} /></label><label>Jenis kegiatan<select name="type" defaultValue={modal.event.type}><option>Rapat</option><option>Deadline</option><option>Monitoring</option><option>Evaluasi</option><option>Lainnya</option></select></label><div className="modal-actions"><button className="secondary" type="button" onClick={() => setModal(null)}>Batal</button><button className="primary" type="submit"><Check size={16}/> Simpan perubahan</button></div></form></Modal>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>
}

export default App
