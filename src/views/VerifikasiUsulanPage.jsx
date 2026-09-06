import { BadgeCheck, Check, ClipboardCheck } from 'lucide-react'
import PageTitle from '../components/PageTitle'
import { rupiah } from '../utils/format'

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

export default VerifikasiUsulanPage
