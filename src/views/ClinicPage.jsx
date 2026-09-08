import { useEffect, useState } from 'react'
import { CalendarCheck, Download, MessagesSquare, Send, Plus } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import { api } from '../services/api'
import { bidangOptions } from '../constants'

const layananOptions = ['Konsultasi Perencanaan (Renja/DPA)', 'Konsultasi Keuangan (RAB/SPJ)', 'Coaching Penyusunan KAK', 'Lainnya']
const sesiOptions = ['Pagi (08.00-11.00)', 'Siang (13.00-15.00)']
const statusClass = s => s === 'Selesai' || s === 'Dikonfirmasi' ? 'done' : s === 'Dibatalkan' ? 'danger' : 'warn'

function ClinicPage({ currentUser, canWrite, isSuperAdmin, notify }) {
  const [tab, setTab] = useState('chat')
  const [threads, setThreads] = useState([])
  const [openThread, setOpenThread] = useState(null)
  const [consultations, setConsultations] = useState([])
  const [templates, setTemplates] = useState([])
  const [newTopic, setNewTopic] = useState('')
  const [reply, setReply] = useState('')
  const [booking, setBooking] = useState({ layanan: layananOptions[0], tanggal: '', sesi: sesiOptions[0], agenda: '' })

  const isStaff = ['Super Admin', 'Admin', 'PPTK'].includes(currentUser.role)
  const canManageTemplates = isSuperAdmin

  const loadAll = () => {
    api('/clinic/threads').then(setThreads).catch(e => notify(e.message || 'Gagal memuat percakapan'))
    api('/clinic/consultations').then(setConsultations).catch(() => {})
    api('/clinic/templates').then(setTemplates).catch(() => {})
  }
  useEffect(() => { loadAll() }, [])

  const createThread = e => {
    e.preventDefault()
    api('/clinic/threads', { method: 'POST', body: JSON.stringify({ topic: newTopic }) })
      .then(t => { setThreads([t, ...threads]); setNewTopic(''); setOpenThread(t.id); notify('Percakapan baru dibuat') })
      .catch(e2 => notify(e2.message || 'Gagal membuat percakapan'))
  }
  const openThreadDetail = id => {
    api(`/clinic/threads/${id}`).then(t => setOpenThread(t)).catch(e => notify(e.message || 'Gagal memuat percakapan'))
  }
  const sendMessage = e => {
    e.preventDefault()
    if (!reply.trim() || !openThread) return
    api(`/clinic/threads/${openThread.id}/messages`, { method: 'POST', body: JSON.stringify({ message: reply }) })
      .then(() => { setReply(''); openThreadDetail(openThread.id); loadAll() })
      .catch(e2 => notify(e2.message || 'Gagal mengirim pesan'))
  }
  const closeThread = (id, status) => {
    api(`/clinic/threads/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      .then(() => { openThreadDetail(id); loadAll(); notify(`Status percakapan: ${status}`) })
      .catch(e => notify(e.message || 'Gagal mengubah status'))
  }
  const deleteThread = id => {
    if (!isSuperAdmin || !window.confirm('Hapus percakapan ini?')) return
    api(`/clinic/threads/${id}`, { method: 'DELETE' })
      .then(() => { setThreads(list => list.filter(t => t.id !== id)); if (openThread?.id === id) setOpenThread(null); notify('Percakapan dihapus') })
      .catch(e => notify(e.message || 'Gagal menghapus percakapan'))
  }
  const bookConsultation = e => {
    e.preventDefault()
    api('/clinic/consultations', { method: 'POST', body: JSON.stringify(booking) })
      .then(c => { setConsultations([c, ...consultations]); setBooking({ ...booking, tanggal: '', agenda: '' }); notify('Jadwal konsultasi diajukan, menunggu konfirmasi') })
      .catch(e2 => notify(e2.message || 'Gagal memesan jadwal'))
  }
  const updateConsultation = (id, patch) => {
    api(`/clinic/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
      .then(u => { setConsultations(list => list.map(c => c.id === id ? u : c)); notify('Jadwal konsultasi diperbarui') })
      .catch(e => notify(e.message || 'Gagal memperbarui jadwal'))
  }
  const deleteConsultation = id => {
    if (!isSuperAdmin || !window.confirm('Hapus jadwal konsultasi ini?')) return
    api(`/clinic/consultations/${id}`, { method: 'DELETE' })
      .then(() => { setConsultations(list => list.filter(c => c.id !== id)); notify('Jadwal konsultasi dihapus') })
      .catch(e => notify(e.message || 'Gagal menghapus jadwal'))
  }
  const downloadTemplate = t => {
    if (!t.file_name) { notify('Berkas template belum tersedia di server.'); return }
    window.open(`/api/clinic/templates/${t.id}/download`, '_blank', 'noopener,noreferrer')
  }
  const uploadTemplateFile = (e, id) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fetch(`/api/clinic/templates/${id}/file`, { method: 'POST', credentials: 'include', body: fd })
      .then(async r => { const d = await r.json().catch(() => null); if (!r.ok) throw new Error(d?.error || 'Gagal unggah'); return d })
      .then(() => { notify('Berkas template berhasil diunggah'); loadAll() })
      .catch(err => notify(err.message || 'Gagal mengunggah berkas'))
  }
  const myBookings = consultations.filter(c => c.user_id === currentUser.id)

  return <>
    <PageTitle eyebrow="Layanan · Pengaturan & Bantuan" title="Klinik Perencanaan & Keuangan" />
    <div className="review-actions" style={{ marginBottom: 12 }}>
      <button className={tab === 'chat' ? 'primary' : 'secondary'} onClick={() => setTab('chat')}><MessagesSquare size={16}/> Chat Q&A Internal</button>
      <button className={tab === 'jadwal' ? 'primary' : 'secondary'} onClick={() => setTab('jadwal')}><CalendarCheck size={16}/> Jadwal Konsultasi</button>
      <button className={tab === 'template' ? 'primary' : 'secondary'} onClick={() => setTab('template')}><Download size={16}/> Pusat Unduhan Template</button>
    </div>

    {tab === 'chat' && <section className="card table-card">
      <div className="card-head"><div><h2>Tanya Jawab Sub Bagian Perencanaan & Keuangan</h2><p>Ajukan pertanyaan seputar perencanaan, anggaran, dan dokumen.</p></div></div>
      <form className="form-grid" onSubmit={createThread} style={{ margin: '10px 0' }}>
        <label className="full">Topik pertanyaan baru
          <input required minLength={5} maxLength={200} value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Contoh: Bagaimana cara revisi pagu kegiatan yang sudah disahkan?" /></label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="primary" type="submit"><Plus size={15}/> Buat percakapan</button></div>
      </form>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Topik</th><th>Pengaju</th><th>Unit</th><th>Status</th><th>Balasan</th><th>Aktivitas</th><th>Aksi</th></tr></thead>
          <tbody>
            {threads.map(t => <tr key={t.id}>
              <td>{t.topic}</td><td>{t.user_name}</td><td>{t.user_bidang || '-'}</td>
              <td><span className={`status ${statusClass(t.status)}`}>{t.status}</span></td>
              <td>{t.message_count}</td>
              <td>{t.last_activity ? new Date(t.last_activity).toLocaleString('id-ID') : new Date(t.created_at).toLocaleString('id-ID')}</td>
              <td><div className="row-actions">
                <button className="secondary xs" onClick={() => openThreadDetail(t.id)}>Buka</button>
                {isStaff && <button className="secondary xs" onClick={() => closeThread(t.id, t.status === 'Selesai' ? 'Dijawab' : 'Selesai')}>{t.status === 'Selesai' ? 'Buka lagi' : 'Tandai selesai'}</button>}
                {isSuperAdmin && <button className="table-action danger xs" onClick={() => deleteThread(t.id)}>Hapus</button>}
              </div></td>
            </tr>)}
            {!threads.length && <tr><td colSpan={7} style={{ textAlign: 'center' }}>Belum ada percakapan. Buat pertanyaan pertama Anda.</td></tr>}
          </tbody>
        </table>
      </div>
      {openThread && <div className="doc-preview" style={{ marginTop: 16 }}>
        <div className="card-head"><div><h3>{openThread.topic}</h3><p>{openThread.user_name} · {openThread.user_bidang || '-'} · <span className={`status ${statusClass(openThread.status)}`}>{openThread.status}</span></p></div>
          <button className="secondary xs" onClick={() => setOpenThread(null)}>Tutup</button></div>
        <div className="review-log">
          {(openThread.messages || []).map(m => <div className="log-entry" key={m.id}><b>{m.sender_name} ({m.sender_role})</b><small>{new Date(m.created_at).toLocaleString('id-ID')}</small><p>{m.message}</p></div>)}
          {!(openThread.messages || []).length && <p className="muted">Belum ada balasan.</p>}
        </div>
        <form className="form-grid" onSubmit={sendMessage}>
          <label className="full">Tulis balasan<textarea required rows={3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Tulis pertanyaan atau jawaban…" /></label>
          <button className="primary" type="submit"><Send size={15}/> Kirim</button>
        </form>
      </div>}
    </section>}

    {tab === 'jadwal' && <>
      <section className="card table-card">
        <div className="card-head"><div><h2>Pesan jadwal konsultasi / coaching</h2><p>Slot bersama Sub Bagian Perencanaan dan Keuangan.</p></div></div>
        <form className="form-grid" onSubmit={bookConsultation} style={{ margin: '10px 0' }}>
          <label>Jenis layanan<select value={booking.layanan} onChange={e => setBooking({ ...booking, layanan: e.target.value })}>{layananOptions.map(l => <option key={l}>{l}</option>)}</select></label>
          <label>Tanggal<input required type="date" value={booking.tanggal} onChange={e => setBooking({ ...booking, tanggal: e.target.value })} /></label>
          <label>Sesi<select value={booking.sesi} onChange={e => setBooking({ ...booking, sesi: e.target.value })}>{sesiOptions.map(s => <option key={s}>{s}</option>)}</select></label>
          <label className="full">Agenda / hal yang dibahas<textarea rows={2} value={booking.agenda} onChange={e => setBooking({ ...booking, agenda: e.target.value })} placeholder="Contoh: konsultasi revisi KAK kegiatan drainase" /></label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="primary" type="submit"><CalendarCheck size={15}/> Ajukan jadwal</button></div>
        </form>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Pemohon</th><th>Unit</th><th>Layanan</th><th>Tanggal</th><th>Sesi</th><th>Status</th><th>Ditangani</th><th>Aksi</th></tr></thead>
            <tbody>
              {(isStaff ? consultations : myBookings).map(c => <tr key={c.id}>
                <td>{c.user_name}</td><td>{c.user_bidang || '-'}</td><td>{c.layanan}</td>
                <td>{c.tanggal}</td><td>{c.sesi}</td>
                <td><span className={`status ${statusClass(c.status)}`}>{c.status}</span></td>
                <td>{c.handled_by || '—'}</td>
                <td><div className="row-actions">
                  {isStaff && c.status === 'Menunggu Konfirmasi' && <button className="secondary xs" onClick={() => updateConsultation(c.id, { status: 'Dikonfirmasi', catatan: `Dikonfirmasi oleh ${currentUser.name}` })}>Konfirmasi</button>}
                  {isStaff && c.status === 'Dikonfirmasi' && <button className="secondary xs" onClick={() => updateConsultation(c.id, { status: 'Selesai' })}>Tandai selesai</button>}
                  {isStaff && c.status !== 'Dibatalkan' && c.status !== 'Selesai' && <button className="table-action danger xs" onClick={() => updateConsultation(c.id, { status: 'Dibatalkan' })}>Batalkan</button>}
                  {isSuperAdmin && <button className="table-action danger xs" onClick={() => deleteConsultation(c.id)}>Hapus</button>}
                </div></td>
              </tr>)}
              {!(isStaff ? consultations : myBookings).length && <tr><td colSpan={8} style={{ textAlign: 'center' }}>Belum ada jadwal konsultasi.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}

    {tab === 'template' && <section className="card table-card">
      <div className="card-head"><div><h2>Pusat Unduhan (Template/SOP)</h2><p>Format SOP, template KAK, RAB, dan berkas pencairan terstandar.</p></div></div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Kategori</th><th>Judul</th><th>Deskripsi</th><th>Berkas</th><th>Ukuran</th><th>Aksi</th></tr></thead>
          <tbody>
            {templates.map(t => <tr key={t.id}>
              <td><span className="status done">{t.category}</span></td>
              <td><b>{t.title}</b></td><td>{t.description || '—'}</td><td>{t.file_name || 'Belum ada berkas'}</td><td>{t.size || '—'}</td>
              <td><div className="row-actions">
                <button className="secondary xs" onClick={() => downloadTemplate(t)}><Download size={14}/> Unduh</button>
                {canManageTemplates && <form onSubmit={e => uploadTemplateFile(e, t.id)} className="row-actions" style={{ gap: 6 }}>
                  <input required type="file" name="file" accept=".pdf,.xlsx,.xls,.doc,.docx" style={{ maxWidth: 180 }} />
                  <button className="primary xs" type="submit">Unggah berkas</button>
                </form>}
              </div></td>
            </tr>)}
            {!templates.length && <tr><td colSpan={6} style={{ textAlign: 'center' }}>Belum ada template.</td></tr>}
          </tbody>
        </table>
      </div>
      {!canManageTemplates && <p className="muted" style={{ fontSize: 12 }}>Hanya Super Admin yang dapat mengunggah berkas template.</p>}
    </section>}
  </>
}

export default ClinicPage
