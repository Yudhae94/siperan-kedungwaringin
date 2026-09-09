import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { exportRkaFormPdf, hitungJumlah, parseNumber, isAccountRow } from '../utils/pdf'
import { Trash2, Eraser, Download, Save, Pencil, Check, Lock } from 'lucide-react'

const fmt = value => new Intl.NumberFormat('id-ID').format(parseNumber(value) || 0)

function RkaForm({ isSuperAdmin, canWrite }) {
  const defaultRows = [
    { kode: '5', uraian: 'BELANJA DAERAH', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '5.1', uraian: 'BELANJA OPERASI', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '5.1.02', uraian: 'Belanja Barang dan Jasa', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '5.1.02.01', uraian: 'Belanja Barang', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '5.1.02.01.01', uraian: 'Belanja Barang Pakai Habis', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '5.1.02.01.01.0026', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '[#]', uraian: 'Belanja Jilid', koefisien: '1', satuan: 'Buah', harga: '44.700', ppn: '', jumlah: '44.700', keterangan: '' },
    { kode: '[#]', uraian: 'Belanja Penggandaan', koefisien: '1', satuan: 'Lembar', harga: '300', ppn: '', jumlah: '300', keterangan: '' },
    { kode: '5.1.02.01.0052', uraian: 'Belanja Makanan dan Minuman Rapat', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' },
    { kode: '[#]', uraian: 'Belanja Makan dan Minum Rapat Evaluasi Kinerja PPA & SAPA', koefisien: '19', satuan: 'Orang / Kali', harga: '45.000', ppn: '', jumlah: '855.000', keterangan: '' },
  ]

  const [rows, setRows] = useState(defaultRows)
  const [tahun, setTahun] = useState('2025')
  const [editTahun, setEditTahun] = useState(false)
  const [editHeader, setEditHeader] = useState(false)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedData, setSavedData] = useState(null)

  // Header editable state
  const [headerTitle, setHeaderTitle] = useState('RINCIAN BELANJA SKPD')
  const [headerSubtitle, setHeaderSubtitle] = useState('PEMERINTAH KABUPATEN BEKASI')
  const [headerFormulir, setHeaderFormulir] = useState('RKA MANUAL - RINCIAN BELANJA SKPD')
  const [satuan, setSatuan] = useState('Kecamatan Kedungwaringin')

  useEffect(() => {
    api('/rka').then(data => {
      if (data.tahun) setTahun(String(data.tahun))
      if (data.satuan) setSatuan(data.satuan)
      if (data.title) setHeaderTitle(data.title)
      if (data.formulir) setHeaderFormulir(data.formulir)
      if (Array.isArray(data.rows) && data.rows.length) {
        setRows(data.rows.map(row => ({
          id: row.id,
          kode: row.kode || '',
          uraian: row.uraian || '',
          koefisien: row.koefisien || '',
          satuan: row.satuan || '',
          harga: row.harga || '',
          ppn: row.ppn || '',
          jumlah: row.jumlah || '',
          keterangan: row.keterangan || ''
        })))
        setSavedData(data)
      }
    }).catch(() => {})
  }, [])

  const deleteRow = index => {
    if (!isSuperAdmin) return
    setRows(prev => prev.filter((_, i) => i !== index))
  }

  const clearRow = index => {
    setRows(prev => prev.map((row, i) => i === index ? { ...row, kode: '', uraian: '', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' } : row))
  }

  const resetAllRows = () => {
    if (!window.confirm('Kosongkan semua baris dan mulai input dari awal?')) return
    setRows([{ kode: '', uraian: '', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' }])
  }

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row
      const next = { ...row, [field]: value }
      if (field === 'koefisien' || field === 'harga' || field === 'ppn') {
        const hasil = hitungJumlah(next)
        next.jumlah = hasil ? fmt(hasil) : ''
      }
      return next
    }))
  }

  const computedRows = rows.map(row => {
    if (isAccountRow(row)) return row
    const hasil = hitungJumlah(row)
    return { ...row, jumlah: hasil ? fmt(hasil) : (row.jumlah || '') }
  })

  const total = computedRows.reduce((sum, row) => isAccountRow(row) ? sum : sum + (parseNumber(row.jumlah) || 0), 0)

  const saveRka = () => {
    setSaving(true)
    api('/rka', { method: 'POST', body: JSON.stringify({
      title: headerTitle,
      tahun,
      satuan,
      formulir: headerFormulir,
      rows: computedRows
    }) }).then(data => {
      setSavedData(data)
      setStatus('Data RKA berhasil disimpan ke database lokal.')
    }).catch(err => {
      setStatus(err.message || 'Gagal menyimpan data RKA.')
    }).finally(() => setSaving(false))
  }

  const exportRkaPdf = () => {
    exportRkaFormPdf({
      title: headerTitle,
      tahun,
      satuan,
      formulir: headerFormulir,
      rows: computedRows,
      total
    })
  }

  return <section className="card rka-card">
    <div className="card-head">
      <div>
        <h2>Input RKA</h2>
        <p>Rencana Kerja dan Anggaran per kegiatan SKPD</p>
      </div>
      <div className="rka-head-actions">
        {canWrite && (
          editHeader
            ? <button className="primary xs" type="button" onClick={() => setEditHeader(false)}><Check size={15}/> Simpan Header</button>
            : <button className="secondary xs" type="button" onClick={() => setEditHeader(true)}><Pencil size={15}/> Edit Header</button>
        )}
        {canWrite && <button className="secondary" type="button" onClick={resetAllRows} title="Kosongkan semua baris"><Eraser size={15}/> Reset semua</button>}
        {canWrite && <button className="secondary" type="button" onClick={() => setRows(prev => [...prev, { kode: '', uraian: '', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '', keterangan: '' }])}>Tambah baris</button>}
      </div>
    </div>

    <div className="rka-meta">
      <div className="rka-meta-field">
        <span className="rka-meta-label">Tahun Anggaran</span>
        {editTahun
          ? <span className="tahun-edit"><input className="rka-meta-input" value={tahun} onChange={e => setTahun(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))} style={{ width: 80 }} /><button className="primary xs" type="button" onClick={() => setEditTahun(false)}>Simpan</button></span>
          : <span className="tahun-view"><b>{tahun}</b>{canWrite && <button className="icon-btn" type="button" title="Edit tahun anggaran" onClick={() => setEditTahun(true)}><Pencil size={14}/></button>}</span>}
      </div>
      <div className="rka-meta-field">
        <span className="rka-meta-label">Satuan</span>
        {canWrite
          ? <input className="rka-meta-input" value={satuan} onChange={e => setSatuan(e.target.value)} style={{ width: 200 }} />
          : <b>{satuan}</b>
        }
      </div>
    </div>

    <div className="rka-sheet">
      <table className="rka-table">
        <thead>
          <tr>
            <th colSpan="4" className="rka-title-cell">
              {editHeader
                ? <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <input value={headerTitle} onChange={e => setHeaderTitle(e.target.value)} style={{ textAlign: 'center', fontWeight: 700, fontSize: 11 }} />
                    <input value={headerSubtitle} onChange={e => setHeaderSubtitle(e.target.value)} style={{ textAlign: 'center', fontSize: 10 }} />
                  </div>
                : <div>{headerTitle}<br/>{headerSubtitle}<br/>SATUAN KERJA PERANGKAT DAERAH</div>
              }
            </th>
            <th className="rka-title-cell">SATUAN</th>
            <th className="rka-title-cell" colSpan="4">
              {editHeader
                ? <input value={headerFormulir} onChange={e => setHeaderFormulir(e.target.value)} style={{ textAlign: 'center', fontWeight: 700, fontSize: 11, width: '100%' }} />
                : <div>FORMULIR<br/>{headerFormulir}</div>
              }
            </th>
          </tr>
          <tr>
            <th colSpan="9" className="rka-center">{headerSubtitle} TAHUN ANGGARAN {tahun}</th>
          </tr>
          <tr>
            <th colSpan="9" className="rka-center">RINCIAN ANGGARAN BELANJA KEGIATAN<br/>SATUAN KERJA PERANGKAT DAERAH</th>
          </tr>
          <tr>
            <th>KODE REKENING</th>
            <th>URAIAN</th>
            <th>KOEFISIEN</th>
            <th>SATUAN</th>
            <th>HARGA SATUAN (RP)</th>
            <th>PPN %</th>
            <th>JUMLAH (RP)</th>
            <th>KETERANGAN</th>
            {canWrite && <th style={{ width: 90 }}>AKSI</th>}
          </tr>
        </thead>
        <tbody>
          {computedRows.map((row, index) => {
            const detail = !isAccountRow(row)
            return (
            <tr key={row.id || `rka-row-${index}`}>
              <td><input value={row.kode} readOnly={!canWrite} onChange={e => updateRow(index, 'kode', e.target.value)} /></td>
              <td><input value={row.uraian} readOnly={!canWrite} onChange={e => updateRow(index, 'uraian', e.target.value)} /></td>
              <td><input value={row.koefisien} readOnly={!canWrite} onChange={e => updateRow(index, 'koefisien', e.target.value)} placeholder={detail ? 'mis. 15' : ''} /></td>
              <td><input value={row.satuan} readOnly={!canWrite} onChange={e => updateRow(index, 'satuan', e.target.value)} placeholder={detail ? 'mis. Orang / Unit' : ''} /></td>
              <td><input value={row.harga} readOnly={!canWrite} onChange={e => updateRow(index, 'harga', e.target.value)} placeholder={detail ? 'mis. 5.000' : ''} /></td>
              <td><input value={row.ppn} readOnly={!canWrite} onChange={e => updateRow(index, 'ppn', e.target.value)} placeholder={detail ? 'mis. 10' : ''} /></td>
              <td>
                {detail
                  ? <input value={row.jumlah} readOnly className="rka-readonly" title="Otomatis: Koefisien x Harga Satuan + PPN" />
                  : <input value={row.jumlah} readOnly={!canWrite} onChange={e => updateRow(index, 'jumlah', e.target.value)} />}
              </td>
              <td><input value={row.keterangan} readOnly={!canWrite} onChange={e => updateRow(index, 'keterangan', e.target.value)} placeholder="Keterangan" /></td>
              {canWrite && (
                <td className="rka-row-actions">
                  <button type="button" className="icon-btn" title="Kosongkan baris ini" onClick={() => clearRow(index)}><Eraser size={15}/></button>
                  {isSuperAdmin && <button type="button" className="table-action danger" title="Hapus baris ini" onClick={() => deleteRow(index)}><Trash2 size={15}/> Hapus</button>}
                </td>
              )}
            </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={canWrite ? 6 : 5} className="rka-total-label"><b>Jumlah Anggaran Sub Kegiatan</b></td>
            <td className="rka-total-value"><b>Rp {new Intl.NumberFormat('id-ID').format(total)}</b></td>
            <td colSpan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div className="rka-actions">
      {!canWrite && <p className="rka-user-notice"><Lock size={14}/> Anda masuk sebagai User — hanya Admin & Super Admin yang dapat mengubah RKA.</p>}
      <button className="secondary" type="button" onClick={exportRkaPdf}><Download size={16}/> Export PDF</button>
      {canWrite && <button className="primary" type="button" onClick={saveRka} disabled={saving}>{saving ? 'Menyimpan...' : <><Save size={16}/> Simpan RKA</>}</button>}
    </div>
    {status && <p className="muted" style={{ marginTop: 12 }}>{status}</p>}
  </section>
}

export default RkaForm