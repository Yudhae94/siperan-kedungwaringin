import { CalendarDays, ClipboardList, FileDown, FileText, FileUp, Upload } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import Stat from '../components/Stat'

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

export default UploadPendukungPage
