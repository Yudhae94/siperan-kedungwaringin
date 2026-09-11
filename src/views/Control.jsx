import { useState } from 'react'
import { Activity, BadgeCheck, Banknote, ClipboardList, FileText, Plus, Upload } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'
import { api } from '../services/api'
import { pct, rupiah } from '../utils/format'

const SPJ_STAGES = ['Review Subag Perencanaan & Keuangan', 'Penandatanganan Camat / Sekcam', 'Tahap Pencairan', 'Selesai Dicairkan']

function Control({ programs, setPrograms, onUpload, canWrite, notify, spjList, setSpjList, lkaData, setLkaData, kartuList, setKartuList, dpaList, setDpaList, usulanRka, isSuperAdmin, role }) {
  // ==== Pemetaan role (PPTK/Camat/Sekcam digabung ke Admin/Super Admin) ====
  // Input Progres Fisik & Keuangan (SPJ) + review + penandatanganan: Admin & Super Admin
  const canInputSpj = ['Admin', 'Super Admin'].includes(role)
  // Review SPJ (tahap 0->1 dan 2->3): Admin Subag Perencanaan & Keuangan (+ Super Admin)
  const canReviewSpj = ['Admin', 'Super Admin'].includes(role)
  // Penandatanganan (tahap 1->2): Admin & Super Admin
  const canSignSpj = ['Admin', 'Super Admin'].includes(role)
  const [tab, setTab] = useState('lka')
  const [selected, setSelected] = useState(programs[0]?.id)
  const current = programs.find(p => p.id === selected) || programs[0]
  const currentPercent = current && current.target ? Math.min(100, Math.round((current.realisasi / current.target) * 100)) : 0
  const usedBudget = current ? Math.min(current.pagu, Math.round((currentPercent / 100) * current.pagu)) : 0
  const remainingBudget = current ? Math.max(0, current.pagu - usedBudget) : 0
  const [spjForm, setSpjForm] = useState({ program_id: '', nama_kegiatan: '', nilai_pencairan: '', progres_fisik: '', progres_keuangan: '', no_spj: '', tanggal_spj: '', catatan: '' })
  const [kartuForm, setKartuForm] = useState({ program_id: '', nama_kegiatan: '', tahapan: '' })
  const [dpaForm, setDpaForm] = useState({ usulan_id: '', nama_kegiatan: '', pagu: '', rincian: '' })

  const updatePercent = (nextPercent) => {
    if (!canWrite || !current) return
    const nextRealisasi = Math.round((nextPercent / 100) * current.target)
    const nextStatus = nextRealisasi >= current.target ? 'Selesai' : nextPercent >= 75 ? 'Berjalan' : 'Perlu perhatian'
    const n = { ...current, realisasi: nextRealisasi, status: nextStatus }
    api(`/programs/${current.id}`,{method:'PATCH',body:JSON.stringify(n)}).then(() => {
      setPrograms(programs.map(p => p.id === current.id ? n : p))
      notify(`Realisasi diatur menjadi ${nextPercent}%`)
    })
  }

  const submitSpj = e => {
    e.preventDefault()
    if (!canWrite) return
    const formEl = e.currentTarget
    const form = new FormData(formEl)
    const payload = new FormData()
    const file = form.get('file')
    if (file && file.name) payload.append('file', file)
    payload.append('program_id', form.get('program_id'))
    payload.append('nama_kegiatan', form.get('nama_kegiatan'))
    payload.append('nilai_pencairan', form.get('nilai_pencairan'))
    payload.append('progres_fisik', form.get('progres_fisik'))
    payload.append('progres_keuangan', form.get('progres_keuangan'))
    payload.append('no_spj', form.get('no_spj'))
    payload.append('tanggal_spj', form.get('tanggal_spj'))
    payload.append('catatan', form.get('catatan'))
    fetch('/api/spj', { method: 'POST', credentials: 'include', body: payload })
      .then(async r => { const data = await r.json().catch(() => null); if (!r.ok) throw new Error(data?.error || 'Gagal menyimpan SPJ'); return data })
      .then(row => { setSpjList(list => [row, ...list]); formEl.reset(); notify('SPJ berhasil disimpan dan masuk review Subag Perencanaan & Keuangan') })
      .catch(err => notify(err.message || 'Gagal menyimpan SPJ'))
  }

  // Tahap berikutnya yang boleh dipilih oleh role ini untuk sebuah item SPJ
  const spjNextStages = item => {
    const from = SPJ_STAGES.indexOf(item.status)
    if (isSuperAdmin) return SPJ_STAGES.filter(s => s !== item.status)
    const next = SPJ_STAGES[from + 1]
    if (!next) return []
    const stageOwner = from === 0 ? canReviewSpj : from === 1 ? canSignSpj : from === 2 ? canReviewSpj : false
    return stageOwner ? [next] : []
  }
  const canManageSpjStatus = isSuperAdmin || canReviewSpj || canSignSpj

  const updateSpjStatus = (id, status) => {
    if (!(isSuperAdmin || canReviewSpj || canSignSpj)) return
    api(`/spj/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      .then(updated => { setSpjList(list => list.map(item => item.id === updated.id ? updated : item)); notify(`Status SPJ diperbarui menjadi: ${status}`) })
      .catch(err => notify(err.message || 'Gagal memperbarui status SPJ'))
  }

  const submitKartu = e => {
    e.preventDefault()
    if (!canWrite) return
    const f = new FormData(e.currentTarget)
    const tahapan = String(f.get('tahapan') || '').split('\n').map(s => s.trim()).filter(Boolean).map((nama, i) => ({ nama, status: i === 0 ? 'Selesai' : 'Belum' }))
    api('/kartu-kendali', { method: 'POST', body: JSON.stringify({ program_id: f.get('program_id'), nama_kegiatan: f.get('nama_kegiatan'), tahapan }) })
      .then(row => { setKartuList(list => [row, ...list]); e.currentTarget.reset(); notify('Kartu kendali berhasil dibuat') })
      .catch(err => notify(err.message || 'Gagal membuat kartu kendali'))
  }

  const submitDpa = e => {
    e.preventDefault()
    if (!canWrite) return
    const f = new FormData(e.currentTarget)
    const usulan = usulanRka.find(u => u.id === Number(f.get('usulan_id')))
    const rincian = usulan ? [{ uraian: usulan.judul, pagu: Number(f.get('pagu')) || 0 }] : []
    api('/dpa', { method: 'POST', body: JSON.stringify({ usulan_id: f.get('usulan_id'), nama_kegiatan: f.get('nama_kegiatan'), bidang: usulan?.bidang || '', pagu: Number(f.get('pagu')) || 0, rincian }) })
      .then(row => { setDpaList(list => [row, ...list]); e.currentTarget.reset(); notify('DPA berhasil disusun') })
      .catch(err => notify(err.message || 'Gagal menyusun DPA'))
  }

  const refreshLka = () => {
    api('/lka').then(setLkaData).catch(() => notify('Gagal memuat LKA'))
  }

  const tabs = [
    { id: 'lka', label: 'Lembar Kendali Anggaran (LKA)', icon: Banknote },
    { id: 'progres', label: 'Input Progres Fisik & Keuangan', icon: Activity },
    { id: 'spj', label: 'Status Verifikasi SPJ', icon: BadgeCheck },
    { id: 'kartu', label: 'Kartu Kendali', icon: ClipboardList },
    { id: 'dpa', label: 'Penyusunan DPA', icon: FileText },
  ]

  return <><PageTitle eyebrow="Siklus kinerja · Monitoring berkala" title="Pengendalian & Realisasi Anggaran"><div className="title-actions-inline">{canWrite && <Button secondary onClick={onUpload}><Upload size={17}/> Unggah bukti realisasi</Button>}<button className="secondary" type="button" onClick={refreshLka}>Muat ulang LKA</button></div></PageTitle>
    <div className="planning-subnav">{tabs.map(t => <button key={t.id} type="button" className={`subnav-btn ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}><t.icon size={16}/> {t.label}</button>)}</div>

    {tab === 'lka' && <section className="card table-card"><div className="card-head"><div><h2>Lembar Kendali Anggaran (LKA)</h2><p>Rekapitulasi pagu, realisasi pencairan, dan sisa anggaran per rekening belanja / kegiatan</p></div><Banknote className="muted-icon"/></div>
      <div className="table-scroll"><table><thead><tr><th>Kode</th><th>Kegiatan</th><th>Bidang</th><th>Pagu</th><th>Realisasi Pencairan</th><th>Sisa Anggaran</th><th>Serapan</th></tr></thead><tbody>
        {(lkaData.rows || []).map(r => <tr key={r.kode}><td>{r.kode}</td><td><b>{r.nama}</b></td><td>{r.bidang}</td><td>{rupiah(r.pagu)}</td><td>{rupiah(r.realisasi)}</td><td>{rupiah(r.sisa)}</td><td><span className={`status ${r.serapan >= 100 ? 'done' : r.serapan >= 75 ? '' : 'warn'}`}>{r.serapan}%</span></td></tr>)}
        {(lkaData.totals && lkaData.totals.pagu > 0) && <tr className="total-row"><td colSpan="3"><b>Total</b></td><td><b>{rupiah(lkaData.totals.pagu)}</b></td><td><b>{rupiah(lkaData.totals.realisasi)}</b></td><td><b>{rupiah(lkaData.totals.sisa)}</b></td><td><b>{lkaData.totals.serapan}%</b></td></tr>}
      </tbody></table></div>
    </section>}

    {tab === 'progres' && <><section className="card detail-card">{current && <><div className="detail-top"><div><span className="eyebrow">{current.kode} · {current.bidang}</span><h2>{current.nama}</h2><p>Penanggung jawab: {current.penanggung}</p></div><span className={`status ${current.status === 'Perlu perhatian' ? 'warn' : current.status === 'Selesai' ? 'done' : ''}`}>{current.status}</span></div><div className="big-progress"><div className="big-progress-head"><span>Realisasi indikator</span><b>{pct(current.realisasi, current.target)}%</b></div><div className="progress"><i style={{width: `${pct(current.realisasi, current.target)}%`}}/></div><div className="metric-row"><div><small>Realisasi fisik</small><b>{current.realisasi} <em>/ {current.target} target</em></b></div><div><small>Pagu anggaran</small><b>{rupiah(current.pagu)}</b></div><div><small>Batas waktu</small><b>{new Date(current.deadline).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</b></div></div><div className="budget-summary"><div><small>Pagu terpakai</small><b>{rupiah(usedBudget)}</b><span>{currentPercent}% dari pagu</span></div><div><small>Sisa pagu</small><b>{rupiah(remainingBudget)}</b><span>{100 - currentPercent}% belum terpakai</span></div></div></div><div className="update-box"><h3>Input realisasi terbaru</h3><p>{canWrite ? 'Pilih tingkat capaian dari 0% sampai 100% untuk melihat progres secara real time.' : 'Mode baca saja: Anda tidak memiliki izin mengubah realisasi.'}</p>{canWrite && <><div className="step-grid">{[0,10,20,30,40,50,60,70,80,90,100].map(step => <button key={step} className={`step-btn ${currentPercent === step ? 'active' : ''}`} onClick={() => updatePercent(step)}>{step}%</button>)}</div><div className="slider-wrap"><label>Capaian saat ini: <strong>{currentPercent}%</strong></label><input type="range" min="0" max="100" step="1" value={currentPercent} onChange={e => updatePercent(Number(e.target.value))} /></div></>}</div></>}</section>
      <section className="card table-card"><div className="card-head"><div><h2>Input Progres Fisik & Keuangan (SPJ)</h2><p>PPTK memperbarui berkas pencairan (SPJ) beserta capaian persentase fisik kegiatan</p></div><Activity className="muted-icon"/></div>
        {canInputSpj ? <form className="form-grid" onSubmit={submitSpj}><label>Kegiatan<select required name="program_id" value={spjForm.program_id} onChange={e => { const p = programs.find(x => x.id === Number(e.target.value)); setSpjForm({ ...spjForm, program_id: e.target.value, nama_kegiatan: p?.nama || '' }) }}><option value="">Pilih kegiatan</option>{programs.map(p => <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>)}</select></label><label>Nama kegiatan<input required name="nama_kegiatan" value={spjForm.nama_kegiatan} onChange={e => setSpjForm({ ...spjForm, nama_kegiatan: e.target.value })} /></label><label>Nilai pencairan (Rp)<input required name="nilai_pencairan" type="number" min="0" value={spjForm.nilai_pencairan} onChange={e => setSpjForm({ ...spjForm, nilai_pencairan: e.target.value })} /></label><label>Progres fisik (%)<input required name="progres_fisik" type="number" min="0" max="100" value={spjForm.progres_fisik} onChange={e => setSpjForm({ ...spjForm, progres_fisik: e.target.value })} /></label><label>Progres keuangan (%)<input required name="progres_keuangan" type="number" min="0" max="100" value={spjForm.progres_keuangan} onChange={e => setSpjForm({ ...spjForm, progres_keuangan: e.target.value })} /></label><label>No. SPJ<input name="no_spj" value={spjForm.no_spj} onChange={e => setSpjForm({ ...spjForm, no_spj: e.target.value })} /></label><label>Tanggal SPJ<input name="tanggal_spj" type="date" value={spjForm.tanggal_spj} onChange={e => setSpjForm({ ...spjForm, tanggal_spj: e.target.value })} /></label><label className="full">Catatan<textarea name="catatan" rows={2} value={spjForm.catatan} onChange={e => setSpjForm({ ...spjForm, catatan: e.target.value })} /></label><label className="upload-field full">Berkas SPJ (PDF/Excel/Word)<input name="file" type="file" accept=".pdf,.xlsx,.xls,.doc,.docx" /></label><button className="primary full" type="submit"><Plus size={17}/> Simpan SPJ & Progres</button></form> : <p className="muted">Mode baca saja: Anda tidak memiliki izin menginput SPJ.</p>}
      </section></>}

    {tab === 'spj' && <section className="card table-card"><div className="card-head"><div><h2>Status Verifikasi SPJ</h2><p>Pelacak posisi dokumen pencairan: review Subag Perencanaan & Keuangan, penandatanganan Camat/Sekcam, atau tahap pencairan</p></div><BadgeCheck className="muted-icon"/></div>
      {spjList.length ? <div className="table-scroll"><table><thead><tr><th>Kegiatan</th><th>Nilai</th><th>Progres Fisik</th><th>Progres Keuangan</th><th>Status</th><th>Riwayat</th>{canManageSpjStatus && <th>Aksi</th>}</tr></thead><tbody>{spjList.map(item => <tr key={item.id}><td><b>{item.nama_kegiatan}</b><small>{item.kode_kegiatan || ''}</small></td><td>{rupiah(item.nilai_pencairan)}</td><td>{item.progres_fisik}%</td><td>{item.progres_keuangan}%</td><td><span className={`status ${item.status === 'Selesai Dicairkan' ? 'done' : ''}`}>{item.status}</span></td><td>{(item.riwayat || []).slice(0, 3).map((h, i) => <small key={i} className="muted">{h.status} · {new Date(h.at).toLocaleString('id-ID')}</small>)}</td>{canManageSpjStatus && <td>{(() => { const opts = spjNextStages(item); return opts.length ? <select value={item.status} onChange={e => updateSpjStatus(item.id, e.target.value)}><option value={item.status}>{item.status} (saat ini)</option>{opts.map(s => <option key={s} value={s}>{s}</option>)}</select> : <small className="muted">Menunggu role lain</small> })()}</td>}</tr>)}</tbody></table></div> : <p className="muted">Belum ada data SPJ. Input progres fisik & keuangan terlebih dahulu.</p>}</section>}

    {tab === 'kartu' && <><section className="card table-card"><div className="card-head"><div><h2>Kartu Kendali Kegiatan</h2><p>Template kartu kendali untuk memantau tahapan setiap kegiatan</p></div><ClipboardList className="muted-icon"/></div>
        {canWrite ? <form className="form-grid" onSubmit={submitKartu}><label>Kegiatan<select required name="program_id"><option value="">Pilih kegiatan</option>{programs.map(p => <option key={p.id} value={p.id}>{p.kode} - {p.nama}</option>)}</select></label><label>Nama kegiatan<input required name="nama_kegiatan" placeholder="Nama kegiatan" /></label><label className="full">Tahapan (satu per baris)<textarea required name="tahapan" rows={4} placeholder={'1. Penyusunan KAK\n2. Verifikasi RAB\n3. Pencairan SPJ'} /></label><button className="primary full" type="submit"><Plus size={17}/> Buat Kartu Kendali</button></form> : <p className="muted">Mode baca saja.</p>}
      </section>
      <section className="card table-card"><div className="card-head"><div><h2>Daftar Kartu Kendali</h2><p>{kartuList.length} kartu terdaftar</p></div></div>
        {kartuList.length ? <div className="download-list">{kartuList.map(k => <div className="download-row" key={k.id}><div className="file-icon"><ClipboardList size={18}/></div><div><b>{k.nama_kegiatan}</b><small>{k.kode_kegiatan || ''} · {k.bidang || ''}</small>{(k.tahapan || []).map((t, i) => <small key={i} className={`muted ${t.status === 'Selesai' ? 'done' : ''}`}>{i + 1}. {t.nama} - {t.status}</small>)}</div><span className={`status ${k.status === 'Aktif' ? '' : 'done'}`}>{k.status}</span></div>)}</div> : <p className="muted">Belum ada kartu kendali.</p>}
      </section></>}

    {tab === 'dpa' && <><section className="card table-card"><div className="card-head"><div><h2>Penyusunan DPA</h2><p>Susun DPA per kegiatan per unit setelah usulan disetujui</p></div><FileText className="muted-icon"/></div>
        {canWrite ? <form className="form-grid" onSubmit={submitDpa}><label>Usulan disetujui<select required name="usulan_id"><option value="">Pilih usulan</option>{usulanRka.filter(u => u.status === 'Disetujui').map(u => <option key={u.id} value={u.id}>{u.judul}</option>)}</select></label><label>Nama kegiatan<input required name="nama_kegiatan" placeholder="Nama kegiatan DPA" /></label><label>Pagu (Rp)<input required name="pagu" type="number" min="0" /></label><button className="primary full" type="submit"><Plus size={17}/> Simpan DPA</button></form> : <p className="muted">Mode baca saja.</p>}
      </section>
      <section className="card table-card"><div className="card-head"><div><h2>Daftar DPA</h2><p>{dpaList.length} DPA terdaftar</p></div></div>
        {dpaList.length ? <div className="table-scroll"><table><thead><tr><th>Kegiatan</th><th>Bidang</th><th>Pagu</th><th>Status</th></tr></thead><tbody>{dpaList.map(d => <tr key={d.id}><td><b>{d.nama_kegiatan}</b><small>{d.kode_kegiatan || ''}</small></td><td>{d.bidang || '-'}</td><td>{rupiah(d.pagu)}</td><td><span className={`status ${d.status === 'Draft' ? 'warn' : 'done'}`}>{d.status}</span></td></tr>)}</tbody></table></div> : <p className="muted">Belum ada DPA yang disusun.</p>}
      </section></>}
  </>
}

export default Control


