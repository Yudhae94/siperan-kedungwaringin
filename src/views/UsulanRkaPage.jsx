import { Check, ClipboardList, FileUp, Plus, Target } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'
import { rupiah } from '../utils/format'

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

export default UsulanRkaPage
