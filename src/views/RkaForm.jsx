import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { makePdfDownload, exportRkaFormPdf, hitungJumlah, parseNumber, isAccountRow } from '../utils/pdf'

const fmt = value => new Intl.NumberFormat('id-ID').format(parseNumber(value) || 0)

function RkaForm() {
  const defaultRows = [
    { kode: '5', uraian: 'BELANJA DAERAH', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1', uraian: 'BELANJA OPERASI', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02', uraian: 'Belanja Barang dan Jasa', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01', uraian: 'Belanja Barang', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01.01', uraian: 'Belanja Barang Pakai Habis', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '5.1.02.01.01.0026', uraian: 'Belanja Alat/Bahan untuk Kegiatan Kantor- Bahan Cetak', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '[#]', uraian: 'Belanja Jilid', koefisien: '1', satuan: 'Buah', harga: '44.700', ppn: '', jumlah: '44.700' },
    { kode: '[#]', uraian: 'Belanja Penggandaan', koefisien: '1', satuan: 'Lembar', harga: '300', ppn: '', jumlah: '300' },
    { kode: '5.1.02.01.0052', uraian: 'Belanja Makanan dan Minuman Rapat', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' },
    { kode: '[#]', uraian: 'Belanja Makan dan Minum Rapat Evaluasi Kinerja PPA & SAPA', koefisien: '19', satuan: 'Orang / Kali', harga: '45.000', ppn: '', jumlah: '855.000' },
  ]

  const [rows, setRows] = useState(defaultRows)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api('/rka').then(data => {
      if (Array.isArray(data.rows) && data.rows.length) {
        setRows(data.rows.map(row => ({
          id: row.id,
          kode: row.kode || '',
          uraian: row.uraian || '',
          koefisien: row.koefisien || '',
          satuan: row.satuan || '',
          harga: row.harga || '',
          ppn: row.ppn || '',
          jumlah: row.jumlah || ''
        })))
      }
    }).catch(() => {})
  }, [])

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row
      const next = { ...row, [field]: value }
      // Hitung otomatis: jumlah = koefisien × harga (+ PPN % bila diisi)
      if (field === 'koefisien' || field === 'harga' || field === 'ppn') {
        next.jumlah = hitungJumlah(next) ? fmt(hitungJumlah(next)) : ''
      }
      return next
    }))
  }

  // Total = penjumlahan seluruh baris rincian (baris akun/header diabaikan)
  const total = rows.reduce((sum, row) => isAccountRow(row) ? sum : sum + (parseNumber(row.jumlah) || 0), 0)

  const saveRka = () => {
    setSaving(true)
    api('/rka', { method: 'POST', body: JSON.stringify({
      title: 'Rencana Kerja dan Anggaran',
      tahun: '2025',
      satuan: 'Kecamatan Kedungwaringin',
      formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD',
      rows
    }) }).then(() => {
      setStatus('Data RKA berhasil disimpan ke database lokal.')
    }).catch(err => {
      setStatus(err.message || 'Gagal menyimpan data RKA.')
    }).finally(() => setSaving(false))
  }

  const exportRkaPdf = () => {
    exportRkaFormPdf({
      title: 'Rencana Kerja dan Anggaran',
      tahun: '2025',
      satuan: 'Kecamatan Kedungwaringin',
      formulir: 'RKA MANUAL - RINCIAN BELANJA SKPD',
      rows,
      total
    })
  }

  return <section className="card rka-card">
    <div className="card-head">
      <div>
        <h2>Input RKA</h2>
        <p>Rencana Kerja dan Anggaran per kegiatan SKPD</p>
      </div>
      <button className="secondary" type="button" onClick={() => setRows(prev => [...prev, { kode: '', uraian: '', koefisien: '', satuan: '', harga: '', ppn: '', jumlah: '' }])}>Tambah baris</button>
    </div>

    <div className="rka-sheet">
      <table className="rka-table">
        <thead>
          <tr>
            <th colSpan="3" className="rka-title-cell">RENCANA KERJA DAN ANGGARAN<br/>KERJA PERANGKAT DAERAH MANUAL</th>
            <th className="rka-title-cell">SATUAN</th>
            <th className="rka-title-cell" colSpan="3">Formulir<br/>RKA MANUAL - RINCIAN BELANJA SKPD</th>
          </tr>
          <tr>
            <th colSpan="7" className="rka-center">Pemerintah Kabupaten Bekasi Tahun Anggaran 2025</th>
          </tr>
          <tr>
            <th colSpan="7" className="rka-center">Rincian Anggaran Belanja Kegiatan<br/>Satuan Kerja Perangkat Daerah</th>
          </tr>
          <tr>
            <th>Kode Rekening</th>
            <th>Uraian</th>
            <th>Koefisien</th>
            <th>Satuan</th>
            <th>Harga</th>
            <th>PPN</th>
            <th>Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const detail = !isAccountRow(row)
            const autoJumlah = hitungJumlah(row)
            return (
            <tr key={row.id || `rka-row-${index}`}>
              <td><input value={row.kode} onChange={e => updateRow(index, 'kode', e.target.value)} /></td>
              <td><input value={row.uraian} onChange={e => updateRow(index, 'uraian', e.target.value)} /></td>
              <td><input value={row.koefisien} onChange={e => updateRow(index, 'koefisien', e.target.value)} placeholder={detail ? 'mis. 10' : ''} /></td>
              <td><input value={row.satuan} onChange={e => updateRow(index, 'satuan', e.target.value)} placeholder={detail ? 'mis. Orang / Kali' : ''} /></td>
              <td><input value={row.harga} onChange={e => updateRow(index, 'harga', e.target.value)} placeholder={detail ? 'mis. 100.000' : ''} /></td>
              <td><input value={row.ppn} onChange={e => updateRow(index, 'ppn', e.target.value)} placeholder={detail ? '%' : ''} /></td>
              <td>
                {detail && autoJumlah
                  ? <input value={fmt(autoJumlah)} readOnly className="rka-readonly" title="Otomatis: Koefisien × Harga" />
                  : <input value={row.jumlah} onChange={e => updateRow(index, 'jumlah', e.target.value)} />}
              </td>
            </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="6">Jumlah Anggaran Sub Kegiatan</td>
            <td>Rp. {new Intl.NumberFormat('id-ID').format(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div className="rka-actions">
      <button className="primary" type="button" onClick={saveRka} disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan RKA'}</button>
      <button className="secondary" type="button" onClick={exportRkaPdf}>Export PDF</button>
    </div>
    {status && <p className="muted" style={{ marginTop: 12 }}>{status}</p>}
  </section>
}

export default RkaForm
