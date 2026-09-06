import { useState } from 'react'
import { FileDown, FileText, FolderOpen, Upload } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'
import { makePdfDownload } from '../utils/pdf'

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

export default PlanningArchive
