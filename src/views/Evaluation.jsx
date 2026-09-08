import { useState } from 'react'
import { Check, ClipboardCheck, FileDown, FileText, ShieldCheck, Upload } from 'lucide-react'
import Button from '../components/Button'
import Modal from '../components/Modal'
import PageTitle from '../components/PageTitle'
import { makePdfDownload } from '../utils/pdf'
import EvaluationReports from './EvaluationReports'

function Evaluation({ programs, docs, approvalBoard, onUpload, onVerify, onDelete, onApprove, canWrite, isSuperAdmin, bidangOptions, notify }) {
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [tab, setTab] = useState('dokumen')

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

  return <><PageTitle eyebrow="Siklus kinerja · Akuntabilitas" title="Evaluasi & Pelaporan">
    <div className="review-actions">
      <button className={tab === 'laporan' ? 'primary' : 'secondary'} type="button" onClick={() => setTab('laporan')}>Laporan & Analisis</button>
      <button className={tab === 'dokumen' ? 'primary' : 'secondary'} type="button" onClick={() => setTab('dokumen')}>Dokumen & Persetujuan</button>
      {canWrite && tab === 'dokumen' && <Button onClick={onUpload}><Upload size={17}/> Unggah laporan</Button>}
    </div>
  </PageTitle>
  {tab === 'laporan' && <EvaluationReports canWrite={canWrite} bidangOptions={bidangOptions || []} notify={notify} />}
  {tab === 'dokumen' && <>
    <div className="eval-stats"><div className="card eval-score"><span className="eyebrow">Nilai kinerja sementara</span><strong>82,6</strong><span className="score-up">▲ 4,2 poin dari semester lalu</span><div className="score-track"><i style={{width:'82.6%'}}/></div><small>Baik · Berdasarkan 4 program dan 12 indikator</small></div><div className="card"><div className="card-head"><div><h2>Kepatuhan pelaporan</h2><p>Status dokumen tahun berjalan</p></div><ClipboardCheck className="muted-icon"/></div><div className="compliance"><div><b>75%</b><span>Tepat waktu</span></div><div><b>2/3</b><span>Terverifikasi</span></div><div><b>0</b><span>Ditolak</span></div></div></div></div>
    {canWrite && <section className="card approval-card"><div className="card-head"><div><h2>Persetujuan per seksi / subbag</h2><p>Hanya Admin dan Super Admin yang dapat menyetujui atau menolak.</p></div><ShieldCheck className="muted-icon"/></div><div className="approval-list">{approvalBoard.map(item => <div className="approval-row" key={item.section}><div className="approval-text"><b>{item.section}</b><small>{item.notes || 'Belum ada catatan'}</small></div><span className={`status ${item.status === 'Disetujui' ? 'done' : 'warn'}`}>{item.status}</span><div className="approval-actions"><button className="secondary xs" type="button" onClick={() => onApprove(item.section, 'Disetujui')}>Setujui</button><button className="table-action danger" type="button" onClick={() => onApprove(item.section, 'Ditolak')}>Tolak</button></div></div>)}</div></section>}
    <section className="card review-card"><div className="card-head"><div><h2>Dokumen yang diunggah</h2><p>Daftar berkas terbaru untuk ditinjau dan diverifikasi</p></div><FileText className="muted-icon"/></div><div className="review-list">{docs.map(d => <div className="review-item" key={d.id}><div className="file-name"><div className="file-icon"><FileText size={16}/></div><div><b>{d.name}</b><small>{d.type} · {d.size} · {d.date}</small></div></div><div className="review-meta"><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span></div><div className="review-actions"><button className="secondary xs" type="button" onClick={() => setSelectedDoc(d)}>Lihat</button>{canWrite && d.status !== 'Terverifikasi' && <button className="table-action" type="button" onClick={() => onVerify(d.id)}><Check size={15}/> Review</button>}<button className="secondary xs" type="button" onClick={() => downloadDoc(d)}><FileDown size={15}/> Unduh</button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(d.id)}>Hapus</button>}</div></div>)}</div></section>
    <section className="card table-card"><div className="card-head"><div><h2>Dokumen pelaporan</h2><p>Kelola dokumen dan status verifikasi</p></div><FileText className="muted-icon"/></div><div className="table-scroll"><table><thead><tr><th>Nama dokumen</th><th>Jenis</th><th>Ukuran</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{docs.map(d => <tr key={d.id}><td><div className="file-name"><div className="file-icon"><FileText size={16}/></div><b>{d.name}</b></div></td><td>{d.type}</td><td>{d.size}</td><td>{d.date}</td><td><span className={`status ${d.status === 'Terverifikasi' ? 'done' : 'warn'}`}>{d.status}</span></td><td><div className="row-actions">{canWrite && d.status !== 'Terverifikasi' && <button className="table-action" onClick={() => onVerify(d.id)}><Check size={15}/> Verifikasi</button>}<button className="secondary xs" type="button" onClick={() => setSelectedDoc(d)}>Lihat</button><button className="secondary xs" type="button" onClick={() => downloadDoc(d)}><FileDown size={15}/> Unduh</button>{isSuperAdmin && <button className="table-action danger" type="button" onClick={() => onDelete(d.id)}>Hapus</button>}</div></td></tr>)}</tbody></table></div></section>
    {selectedDoc && <Modal title="Preview dokumen" onClose={() => setSelectedDoc(null)}><div className="doc-preview"><div className="preview-badge">{selectedDoc.status}</div><h3>{selectedDoc.name}</h3><div className="doc-meta"><span><b>Jenis:</b> {selectedDoc.type}</span><span><b>Ukuran:</b> {selectedDoc.size}</span><span><b>Tanggal:</b> {selectedDoc.date}</span></div><p>{selectedDoc.preview || 'Dokumen ini sedang dipantau dalam proses evaluasi dan pelaporan. Silakan tinjau kelengkapan, kesesuaian data, dan status verifikasi sebelum ditutup atau disetujui.'}</p>{(selectedDoc.review_log || []).length > 0 && <div className="review-log"><h4>Riwayat review</h4>{(selectedDoc.review_log || []).map(log => <div className="log-entry" key={log.id}><b>{log.action}</b><small>{log.reviewer} · {new Date(log.at).toLocaleString('id-ID')}</small><p>{log.notes}</p></div>)}</div>}<div className="review-actions modal-actions"><button className="secondary" type="button" onClick={() => setSelectedDoc(null)}>Tutup</button><button className="secondary" type="button" onClick={() => downloadDoc(selectedDoc)}>Unduh file</button>{canWrite && selectedDoc.status !== 'Terverifikasi' && <button className="primary" type="button" onClick={() => { onVerify(selectedDoc.id); setSelectedDoc(null) }}><Check size={15}/> Review dokumen</button>}</div></div></Modal>}
  </>}
  </>
}

export default Evaluation
