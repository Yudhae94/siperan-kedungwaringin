import { useEffect, useState } from 'react'
import { CalendarDays, FileText, Save } from 'lucide-react'
import Button from '../components/Button'
import PageTitle from '../components/PageTitle'
import { api } from '../services/api'
import { exportEvaluation, reportColumns, reportTitles, reportValue, displayValue, reportNotes } from '../utils/evaluationReports'

const reportMenus = [
  { type: 'realisasi', title: 'Laporan Realisasi Bulanan/Triwulanan', desc: 'Analisis realisasi anggaran (keuangan & serapan) per bulan atau triwulan untuk bahan rapat koordinasi/evaluasi internal.' },
  { type: 'deviasi', title: 'Matriks Deviasi Realisasi', desc: 'Rekapitulasi kegiatan yang tepat waktu vs terhambat beserta alasan kendala operasional dan tindak lanjutnya.' },
  { type: 'kinerja', title: 'Laporan Capaian Kinerja', desc: 'Rekapitulasi ketercapaian target output/outcome setiap kegiatan.' },
]

const currentYear = () => new Date().getFullYear()
const defaultPeriod = () => ({ tahun: currentYear(), mode: 'bulanan', periode: new Date().getMonth() + 1 })

function EvaluationReports({ canWrite, bidangOptions, notify }) {
  const [menu, setMenu] = useState(null)
  const [filter, setFilter] = useState(defaultPeriod())
  const [bidang, setBidang] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [archives, setArchives] = useState([])
  const [exporting, setExporting] = useState(false)

  const loadArchives = () => api('/evaluation/archives').then(setArchives).catch(() => { })
  useEffect(() => { loadArchives() }, [])

  const loadReport = (type, params = filter, unit = bidang) => {
    setLoading(true)
    const query = new URLSearchParams({ tahun: params.tahun, mode: params.mode, periode: params.periode, bidang: unit })
    api(`/evaluation/report?${query}`)
      .then(data => { setReport(data); setMenu(type) })
      .catch(err => notify(err.message || 'Gagal memuat laporan'))
      .finally(() => setLoading(false))
  }

  const archiveReport = () => {
    if (!menu || !canWrite) return
    api('/evaluation/archives', { method: 'POST', body: JSON.stringify({ jenis: menu, tahun: filter.tahun, mode: filter.mode, periode: filter.periode, bidang }) })
      .then(() => { notify('Laporan berhasil diarsipkan ke database'); loadArchives() })
      .catch(err => notify(err.message || 'Gagal mengarsipkan laporan'))
  }

  const openArchive = id => {
    api(`/evaluation/archives/${id}`)
      .then(row => {
        setReport(row.snapshot)
        setMenu(row.jenis)
        setFilter({ tahun: Number(row.snapshot.period?.tahun) || currentYear(), mode: row.snapshot.period?.mode || 'bulanan', periode: row.snapshot.period?.periode || 1 })
        setBidang(row.bidang || '')
        notify('Arsip laporan dimuat')
      })
      .catch(err => notify(err.message || 'Gagal memuat arsip'))
  }

  const deleteArchive = id => {
    if (!canWrite || !window.confirm('Hapus arsip laporan ini?')) return
    api(`/evaluation/archives/${id}`, { method: 'DELETE' })
      .then(() => { notify('Arsip laporan dihapus'); loadArchives() })
      .catch(err => notify(err.message || 'Gagal menghapus arsip'))
  }

  const doExport = async format => {
    if (!report || !menu) return
    setExporting(true)
    try { await exportEvaluation(report, menu, format); notify(`Laporan diunduh sebagai ${format.toUpperCase()}`) }
    catch (err) { notify(err.message || 'Gagal mengekspor laporan') }
    finally { setExporting(false) }
  }

  const periodLabel = report ? (report.period.mode === 'bulanan' ? `Bulan ${report.period.periode} ${report.period.tahun}` : `Triwulan ${report.period.periode} ${report.period.tahun}`) : ''
  const summary = report ? report.totals : null

  return <>
    <PageTitle eyebrow="Evaluasi & Pelaporan · Cetak otomatis" title="Laporan Evaluasi & Pelaporan" />
    <div className="eval-stats">
      {reportMenus.map(item => (
        <div className="card eval-score" key={item.type} style={{ cursor: 'pointer' }} onClick={() => loadReport(item.type)}>
          <span className="eyebrow">{item.title}</span>
          <p style={{ fontSize: 13, margin: '8px 0 12px' }}>{item.desc}</p>
          <div className="review-actions modal-actions" style={{ justifyContent: 'flex-start' }}>
            <button className="primary xs" type="button" onClick={e => { e.stopPropagation(); loadReport(item.type) }}>
              {item.type === 'realisasi' ? <CalendarDays size={15} /> : <FileText size={15} />} Buka laporan
            </button>
          </div>
        </div>
      ))}
    </div>

    {loading && <p className="muted">Memuat laporan…</p>}

    {menu && report && !loading && (
      <section className="card table-card">
        <div className="card-head">
          <div>
            <h2>{reportTitles[menu]}</h2>
            <p>{periodLabel} · {report.bidang || 'Semua Unit'} · Dibuat {new Date(report.generated_at).toLocaleString('id-ID')}</p>
          </div>
          <div className="review-actions">
            <button className="secondary xs" type="button" disabled={exporting} onClick={() => doExport('pdf')}>Unduh PDF</button>
            <button className="secondary xs" type="button" disabled={exporting} onClick={() => doExport('excel')}>Unduh Excel</button>
            {canWrite && <button className="primary xs" type="button" onClick={archiveReport}><Save size={15} /> Arsipkan</button>}
          </div>
        </div>

        <div className="eval-stats" style={{ marginTop: 12 }}>
          <div className="card"><span className="eyebrow">Total Pagu</span><strong>{displayValue(summary.pagu)}</strong></div>
          <div className="card"><span className="eyebrow">Realisasi Periode</span><strong>{displayValue(summary.periode)}</strong></div>
          <div className="card"><span className="eyebrow">Realisasi Kumulatif (YTD)</span><strong>{displayValue(summary.kumulatif)}</strong></div>
          <div className="card"><span className="eyebrow">Serapan Kumulatif</span><strong>{summary.serapan != null ? `${summary.serapan}%` : '—'}</strong></div>
        </div>

        <form className="form-grid" style={{ margin: '12px 0' }} onSubmit={e => { e.preventDefault(); loadReport(menu) }}>
          <label>Tahun<input name="tahun" type="number" min="2000" max="2100" value={filter.tahun} onChange={e => setFilter({ ...filter, tahun: Number(e.target.value) })} /></label>
          <label>Mode<select value={filter.mode} onChange={e => setFilter({ ...filter, mode: e.target.value, periode: e.target.value === 'triwulanan' ? Math.ceil(filter.periode / 3) : filter.periode })}><option value="bulanan">Bulanan</option><option value="triwulanan">Triwulanan</option></select></label>
          <label>Periode{filter.mode === 'triwulanan'
            ? <select value={filter.periode} onChange={e => setFilter({ ...filter, periode: Number(e.target.value) })}><option value="1">Triwulan I</option><option value="2">Triwulan II</option><option value="3">Triwulan III</option><option value="4">Triwulan IV</option></select>
            : <select value={filter.periode} onChange={e => setFilter({ ...filter, periode: Number(e.target.value) })}>{Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Bulan {i + 1}</option>)}</select>}
          </label>
          <label>Bidang/Unit<select value={bidang} onChange={e => setBidang(e.target.value)}><option value="">Semua Unit</option>{bidangOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></label>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><Button type="submit">Terapkan</Button></div>
        </form>

        <div className="table-scroll">
          <table>
            <thead><tr>{reportColumns[menu].map(([key, label]) => <th key={key}>{label}</th>)}</tr></thead>
            <tbody>
              {report.rows.map(row => (
                <tr key={row.program_id}>
                  {reportColumns[menu].map(([key]) => <td key={key}>{displayValue(reportValue(row, key))}</td>)}
                </tr>
              ))}
              {!report.rows.length && <tr><td colSpan={reportColumns[menu].length} style={{ textAlign: 'center' }}>Tidak ada data kegiatan untuk filter ini.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>{reportNotes}</p>
      </section>
    )}

    <section className="card review-card">
      <div className="card-head">
        <div><h2>Arsip laporan (database)</h2><p>Laporan yang telah disimpan — dapat dimuat kembali kapan saja</p></div>
        <FileText className="muted-icon" />
      </div>
      <div className="table-scroll">
        <table>
          <thead><tr><th>Jenis laporan</th><th>Periode</th><th>Bidang</th><th>Dibuat oleh</th><th>Waktu</th><th>Aksi</th></tr></thead>
          <tbody>
            {archives.map(a => (
              <tr key={a.id}>
                <td>{reportTitles[a.jenis] || a.jenis}</td>
                <td>{a.periode}</td>
                <td>{a.bidang || 'Semua Unit'}</td>
                <td>{a.created_by}</td>
                <td>{new Date(a.created_at).toLocaleString('id-ID')}</td>
                <td><div className="row-actions">
                  <button className="secondary xs" type="button" onClick={() => openArchive(a.id)}>Muat</button>
                  {canWrite && <button className="table-action danger" type="button" onClick={() => deleteArchive(a.id)}>Hapus</button>}
                </div></td>
              </tr>
            ))}
            {!archives.length && <tr><td colSpan={6} style={{ textAlign: 'center' }}>Belum ada arsip laporan.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </>
}

export default EvaluationReports
