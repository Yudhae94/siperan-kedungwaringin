import { pct, rupiah } from '../utils/format'

function ProgramTable({ programs, canWrite, isSuperAdmin, onDelete, onProgress }) {
  const showActions = canWrite || isSuperAdmin
  return <div className="table-scroll"><table><thead><tr><th>Kode / Program</th><th>Bidang</th><th>Pagu anggaran</th><th>Progress</th><th>Status</th><th>Penanggung jawab</th>{showActions && <th>Aksi</th>}</tr></thead><tbody>{programs.map(p => <tr key={p.id}><td><b>{p.kode}</b><span>{p.nama}</span></td><td>{p.bidang}</td><td>{rupiah(p.pagu)}</td><td><button type="button" className="progress-cell progress-button" onClick={() => canWrite && onProgress(p)} title={canWrite ? 'Klik untuk mengatur progress' : 'Progress'}><span className="progress"><i style={{width: `${Math.min(100, pct(p.realisasi, p.target))}%`}}/></span><small>{pct(p.realisasi, p.target)}%</small></button></td><td><span className={`status ${p.status === 'Selesai' ? 'done' : p.status === 'Perlu perhatian' ? 'warn' : ''}`}>{p.status}</span></td><td>{p.penanggung}</td>{showActions && <td>{isSuperAdmin && <button className="table-action danger" onClick={() => onDelete(p.id)}>Hapus</button>}</td>}</tr>)}</tbody></table></div>
}

export default ProgramTable